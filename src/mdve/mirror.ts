/**
 * MDVE Mirror Engine — the DXY→EU→GU mechanical cascade
 * (PLUTUS_V4.4_MDVE_SPEC §9, algorithm §9.6 implemented EXACTLY) + the §8.1
 * structural-anchor gate (the RESOLVED passive-level ruling).
 *
 * ═══════════════════════════════════════════════════════════════
 * Doctrine (§9.1, the operator verbatim): "Every DXY trade MECHANICALLY
 * maps to a mirror trade from the exact same (inverse — supply=demand,
 * demand=supply) zones on EU/GU. Copy the trade, invert the
 * directions/zones, find the price coordinates on the specific pair.
 * EU and GU CANNOT have LESS trades than DXY. GU diverges: some
 * cascaded setups die to the RRR filter (GU's volatility)."
 *
 * The mirror maps STRUCTURE, never price arithmetic (§15 anti-goal:
 * NO `EU_price = f(DXY_price)` — FORBIDDEN). Every coordinate in a
 * mirror trade comes from the TARGET pair's OWN chart model: its own
 * zones (anchor), its own ladder (SL rung, TP rung), its own reaction
 * events (session label — GU timing drift, §9.3).
 *
 * Zero pixels, zero LLM (§12 Law 1). Deterministic (§12 Law 2): same
 * models + setups → byte-identical output. No wall-clock, no
 * randomness, every sort comparator is total (id tiebreak).
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar, TradeSetup } from '../types.js';
import { PIP_VALUE } from '../types.js';
import { PIP_VALUE_DEFAULT, rrrForCategory } from '../constants/trading-constants.js';
import type { ScaffoldRung } from '../engines/ladder-scaffold.js';
import type {
  ChartModel,
  MirrorMapping,
  SessionLabel,
  WeeklyNarrative,
  ZoneModel,
} from './types.js';
import { BATTLE_KINDS } from './types.js';
import { classifyTouch } from './lqz-matrix.js';
import type { LqzZoneMatrix, LmvTable } from './lmv.js';
import { computeAtr, priceDecimals, sessionOf } from './util.js';
import { computeSL_LMV, GOLDEN_SL_MAX_PIPS, entryPrice_LMV } from './sl-lmv.js';
// Wave ZR-3 (2026-08-04 — the E3 CONDITIONAL ANCHORS, the D37 killers):
// the ZR-1 zone-relevance function (WHICH structure currently defends the
// trade — the pressure-state switch, never a static role).
import { computeOperativeDefense } from './zone-pressure.js';
import { detectHallucination, recordLayerCause } from './hallucination-detector.js';
import type { HallucinationVerdict } from './hallucination-detector.js';
import { writeRejectedSetup, runIdOf } from './rejected-log.js';
import type { DedupSetup } from './trade-dedup.js';
import type { ShapeDayZone, CascadedShapeChain } from './shape-cascade.js';
// R2 (Phase 7): the E/SL/TP refinement machine — an RRR-failed mirror is
// REPAIRED (up to 3 attempts on the same zone anchors) before hard-reject.
import { refineSetup } from './refinement-machine.js';
// Wave I1 (2026-08-01, FIX PLAN §3/§10/§10.4): the 3D REFINEMENT MACHINE —
// the deterministic 3-layer audit (P1-P8/C1-C6/T1-T8 → the §19.1 audit card)
// + the RE_TRANSLATE loop (Layer 2 failure → re-anchor at the structurally-
// equivalent zone). "refinement machine needs full awareness of pipeline
// mechanics and cascade mechanics AND trade setup mechanics (3D refinement
// machine)... 60-40 deterministic/model inference" — the machine's job is
// the mechanical card + the verdict matrix; the model reasons over the card
// in the MANUAL REVIEW STAGE (Wave K).
import { auditSetup3D, retranslateSetup } from './refinement-machine.js';
import type { ThreeDAuditCard, ThreeDAuditInput, AuditCheckResult } from './refinement-machine.js';
import type { TranslatedDayMap } from './cascade-translation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formation-time match tolerance = ±24h.
 * BECAUSE (§9.2 rule 2, the operator): the same macro structure forms
 * within a day on both charts — the Jul 6 sweep: DXY 06:00, EU the same
 * session. Covers GU's documented drift profile ("early or late by a few
 * hours or sometimes even a full session", §9.3 timing-drift note).
 */
export const FORMATION_TIME_TOLERANCE_MS = 24 * 3_600_000;

/**
 * Law 7 SL buffer per pair (pips) — SL sits 2-5 pips INSIDE the next
 * structural rung, measured in from its NEAR edge.
 * BECAUSE: canon SL_BUFFER_PIPS (visual-setup-generator.ts:69-71 —
 * EUR 2, GBP 3, AUD 3, DXY 5). Replicated, not imported: the frozen
 * generator does not export it and the frozen machinery must not be
 * modified (§12 Law 6; the ladder-scaffold CANON REPLICAS precedent).
 * EXPORTED (v4.4.0c): setup-gen reuses the buffer for the §8.4.1 entry
 * band and the cross-structure merge tolerance.
 */
export const LAW7_SL_BUFFER_PIPS: Record<string, number> = {
  'EUR/USD': 2, 'GBP/USD': 3, 'AUD/USD': 3, 'DXY': 5,
};

/**
 * D17 SL ceiling = 36 pips, HARD.
 * BECAUSE: canon D17 (visual-setup-generator.ts:1251-1254 — "36-pip HARD
 * ceiling — exceeded → null; the retry loop repairs"). The mirror's
 * repair = walk to the next rung (§9.6 Stage 2 task spec); if no rung
 * yields SL ≤ 36 pips the mirror's SL is invalid → discard (honest,
 * logged — never silently widened).
 */
const D17_SL_CEILING_PIPS = 36;

/**
 * Law-10 ATR fraction = 0.5 × ATR(14, 1H) — SL floor, never tighter.
 * BECAUSE: canon Law 10 (visual-setup-generator.ts:1238-1249 — "an 8-pip
 * SL into a 15-pip ATR bar dies to ordinary noise").
 */
const LAW10_ATR_FRACTION = 0.5;

/**
 * Viable-RRR precondition: |TP − entry| ≥ 1.2 × |entry − SL|.
 * BECAUSE: canon (visual-setup-generator.ts:1304) — targets that cannot
 * pay for the risk are skipped, not rejected.
 */
const MIN_TP_SL_RATIO = 1.2;

/**
 * Timeframe rank for Law 12 (TP timeframe ≥ entry timeframe).
 * BECAUSE: canon tfRank (visual-setup-generator.ts:1332 — "a 15m scalp
 * targets 30m+"). ZoneModel/ScaffoldRung timeframes are 30m/1H/4H.
 */
const TF_RANK: Record<string, number> = { '30m': 2, '1H': 3, '4H': 4 };

/**
 * Source-zone resolution tolerance = 10 pips.
 * BECAUSE: canon SNIPER_ENTRY_MAX_EDGE_DISTANCE_PIPS
 * (trading-constants.ts:96) — an entry must be within 10 pips of its
 * zone edge; the same tolerance binds a source setup to its anchor zone.
 */
const SOURCE_ZONE_TOLERANCE_PIPS = 10;

/**
 * Structural entry-anchor sources (§8.1 ruling 1, verbatim):
 * `structural(zone) ⟺ zone.source ∈ {ORDER_BLOCK, LQZ}` — clear S/D or
 * LQ. Passive pillar levels (PIVOT / MA / OPTION_WALL / FIB_RETRACE /
 * SWING_EXTREME) are RETIRED from the entry pool: they remain rungs,
 * SL/TP anchors, Law-14 walk points and confluence context — NEVER
 * entries. (The DXY=39 evidence: all 39 slop setups anchored on passive
 * levels; the golden standard's 8 trades all anchor on OB/LQZ.)
 */
const STRUCTURAL_ENTRY_SOURCES: ReadonlySet<string> = new Set(['ORDER_BLOCK', 'LQZ']);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mirror status. 'ACTIVE' | 'RRR_DISCARDED' are the §5 canon statuses.
 * 'SL_INVALID' | 'TP_NULL' | 'SOURCE_INVALID' are the honest construction
 * failures (§12 Law 3 — no invented truth: a mirror whose target geometry
 * cannot carry the trade is marked for discard with the reason, never
 * silently repaired beyond doctrine).
 * 'CS1_INVALID' | 'NARRATIVE_SUPPRESSED' are the v4.5 common-sense
 * discard statuses (PLUTUS_V4.5_SPEC §6 Fix 4 / §7 Fix 5): a structurally
 * un-enterable mirror (session-open already beyond the SL) or a
 * weak-zone counter-narrative mirror is declared invalid and honestly
 * discarded with the reason — NEVER emitted.
 */
export type MirrorStatus =
  | 'ACTIVE'
  | 'RRR_DISCARDED'
  | 'SL_INVALID'
  | 'TP_NULL'
  | 'SOURCE_INVALID'
  | 'CS1_INVALID'
  | 'NARRATIVE_SUPPRESSED';

/**
 * The mirror engine's output record — §5 MirrorMapping plus the
 * provenance the firewall and the report lane consume. Geometry fields
 * (entry/sl/tp/rrr) are INERT on non-ACTIVE mirrors (sl/tp = entry,
 * rrr = 0): status + discardReason carry the truth, never a fabricated
 * trade (§12 Law 3).
 */
export interface MirrorOutcome extends Omit<MirrorMapping, 'status'> {
  status: MirrorStatus;
  /** The TARGET pair of this mirror ('EUR/USD' | 'GBP/USD'). */
  pair: string;
  /** Source setup's category (carried: RRR floor + GU propagation). */
  category: string;
  /**
   * Single-entry RRR = |tp − entry| / |entry − sl| computed on the
   * TARGET pair's actual geometry (§9.3 "rrr recomputed from the target
   * pair's actual geometry"). DOCUMENTED CHOICE (task spec Stage 2):
   * single-entry, not the 0.33/0.33/0.34 staggered blend — MirrorMapping
   * carries ONE entry (the anchor's edge); the staggered-entry system is
   * the live generator's fill mechanic, not mirror structure.
   */
  rrr: number;
  /**
   * Session of the TARGET pair's own latest reaction event at the
   * anchor — NOT the source's timestamp (§9.3 timing drift: GU's moves
   * begin early/late by hours or a full session; the session label comes
   * from when the target's bars actually touched the anchor).
   */
  session: SessionLabel | null;
  /** SL provenance (next-lqz-rung | next-structural-rung, +law10-floor). */
  slMethod: string;
  /** The Law-14 walk's effective target rung id (null when TP_NULL). */
  tpRungId: string | null;
  /** The chain label: source.mirrorOf ?? source's own id. */
  mirrorOf?: string;
}

/** A mirror that found no structural-equivalence anchor (§9.2 rule 4 — honest, logged). */
export interface FailedAnchor {
  sourceId: string;
  targetPair: string;
  reason: string;
}

/** The cascade result the firewall consumes (§9.6 Stage 3, §11 mirror-floor). */
export interface MirrorCascadeResult {
  /** Every constructed EU mirror (ACTIVE + discarded — discards are documented casualties). */
  eu: MirrorOutcome[];
  /** Every constructed GU mirror (sources = the ACTIVE EU mirrors only, §9.6). */
  gu: MirrorOutcome[];
  /** Sources with NO structural-equivalence anchor (honest — the emergent lane covers them). */
  failedAnchors: FailedAnchor[];
  /** eu+gu mirrors with status ≠ 'ACTIVE' — every one carries a discardReason (§11 temporal). */
  discarded: MirrorOutcome[];
}

/** The §8.1 gate's verdict. */
export interface AnchorGateResult {
  valid: boolean;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Zone midpoint — the rank/distance metric (§9.2 rule 3). */
function mid(z: { top: number; bottom: number }): number {
  return (z.top + z.bottom) / 2;
}

/** Total id comparator — every sort in this module is fully deterministic. */
function cmpId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** The source pair's zones ordered from ITS spot (rank fallback's input, §9.2 rule 3). */
function zonesFromSpot(zones: ZoneModel[], spot: number): ZoneModel[] {
  return [...zones].sort((a, b) =>
    (Math.abs(mid(a) - spot) - Math.abs(mid(b) - spot)) || cmpId(a, b));
}

/** Discriminate the source union: an EU MirrorOutcome carries sourceSetupId. */
function isMirrorOutcome(source: TradeSetup | MirrorOutcome): source is MirrorOutcome {
  return 'sourceSetupId' in source;
}

function sourceDirectionOf(source: TradeSetup | MirrorOutcome): 'LONG' | 'SHORT' | 'NEUTRAL' {
  if (isMirrorOutcome(source)) return source.direction;
  const d = String(source.direction);
  return d === 'LONG' ? 'LONG' : d === 'SHORT' ? 'SHORT' : 'NEUTRAL';
}

function sourceCategoryOf(source: TradeSetup | MirrorOutcome): string {
  return isMirrorOutcome(source) ? source.category : String(source.category);
}

function sourceIdOf(source: TradeSetup | MirrorOutcome): string {
  return isMirrorOutcome(source) ? source.sourceSetupId : source.setupId;
}

function mirrorOfOf(source: TradeSetup | MirrorOutcome): string {
  return isMirrorOutcome(source) ? (source.mirrorOf ?? source.sourceSetupId) : source.setupId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1 — ANCHOR MATCHING (structural equivalence, §9.2 / §9.6 Stage 1)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * findMirrorAnchor — the structural-equivalence matcher.
 *
 * INVERSE-TYPE semantics (the DXY→EU mapping, §9.2 rule 1): the same
 * institutional structure exists on EU inverted (EU candles are ~80-90%
 * inverted DXY) — a DXY supply's EU counterpart is a DEMAND zone.
 *
 *   1a. FORMATION-TIME MATCH (primary): candidates within ±24h of the
 *       source's formationMs, nearest time-distance wins.
 *   1b. RANK MATCH (fallback): the nth inverse-type zone from targetSpot
 *       ↔ the source's rank from ITS spot among its own type.
 *
 * No match at all → null (the mirror is declared FAILED for that setup —
 * honest, logged by the caller; §9.2 rule 4).
 *
 * @param sourceZonesFromSpot  The SOURCE pair's zones PRE-SORTED ascending
 *        by |mid − sourceSpot| (see zonesFromSpot). INTERPRETATION NOTE:
 *        the mandated signature carries no source spot, so the caller
 *        supplies the from-spot ordering; rank = the source's 1-based
 *        index within its own-type subsequence (unknown id → rank 1).
 */
export function findMirrorAnchor(
  source: ZoneModel,
  targetZones: ZoneModel[],
  targetSpot: number,
  sourceZonesFromSpot: ZoneModel[],
): ZoneModel | null {
  const inverseType = source.type === 'SUPPLY' ? 'DEMAND' : 'SUPPLY';
  const candidates = targetZones.filter((z) => z.type === inverseType);
  if (candidates.length === 0) return null;

  // ── 1a. FORMATION-TIME MATCH (primary) ──
  const timeMatched = candidates
    .filter((z) => Math.abs(z.formationMs - source.formationMs) <= FORMATION_TIME_TOLERANCE_MS)
    .sort((a, b) =>
      (Math.abs(a.formationMs - source.formationMs) - Math.abs(b.formationMs - source.formationMs)) ||
      (Math.abs(mid(a) - targetSpot) - Math.abs(mid(b) - targetSpot)) ||
      cmpId(a, b));
  if (timeMatched.length > 0) return timeMatched[0]!;

  // ── 1b. RANK MATCH (fallback) ──
  const sameType = sourceZonesFromSpot.filter((z) => z.type === source.type);
  const idx = sameType.findIndex((z) => z.id === source.id);
  const sourceRank = idx >= 0 ? idx + 1 : 1;
  const rankSorted = [...candidates].sort((a, b) =>
    (Math.abs(mid(a) - targetSpot) - Math.abs(mid(b) - targetSpot)) || cmpId(a, b));
  return rankSorted[sourceRank - 1] ?? null;
}

/**
 * EU→GU anchor matching KEEPS the structure type (§9.3: EU→GU keeps
 * direction; golden trace A.5: EU's supply ~1.1444 → GU's equivalent
 * supply ~1.3455 — supply↔supply, NOT inverted). The mandated Stage-1
 * matcher is specified inverse-type (the DXY→EU semantics); feeding it a
 * type-inverted VIEW of the source side recovers the identity mapping
 * through the same normative code path — no second matcher, no drift.
 * (inverse(inverse(T)) = T; the flipped source-list keeps the rank
 * fallback's same-type subsequence exactly the original type's.)
 */
function findAnchorKeepType(
  source: ZoneModel,
  sourceZonesFromSpot: ZoneModel[],
  targetZones: ZoneModel[],
  targetSpot: number,
): ZoneModel | null {
  const flip = (t: 'SUPPLY' | 'DEMAND'): 'SUPPLY' | 'DEMAND' =>
    t === 'SUPPLY' ? 'DEMAND' : 'SUPPLY';
  const flippedSource: ZoneModel = { ...source, type: flip(source.type) };
  const flippedList: ZoneModel[] = sourceZonesFromSpot.map((z) => ({ ...z, type: flip(z.type) }));
  return findMirrorAnchor(flippedSource, targetZones, targetSpot, flippedList);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2 — MIRROR CONSTRUCTION (§9.3 / §9.6 Stage 2)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ATR(1H) proxy in pips from the target model's LQZ matrix.
 * BECAUSE: §6.2.1 fixes the matrix bucket ε = 0.25 × ATR(14, 1H); the
 * narrowest confirmed entry spans the fewest buckets, so
 * ATR ≈ 4 × min(entry width). The ChartModel carries no bars (the mirror
 * is a pure function of MODELS), so the model's own ε is the only honest
 * ATR source. Unknown (empty matrix) → 0 → the Law-10 floor is skipped —
 * the canon behavior for unknown ATR (visual-setup-generator.ts:1241).
 * Estimation error direction is CONSERVATIVE (merged multi-bucket classes
 * overestimate ATR → a wider SL floor → more noise survival margin).
 *
 * EXPORTED (v4.4.0c): the source-setup generator (setup-gen.ts) reuses
 * this proxy so the Law-10 floor is IDENTICAL between source and mirror.
 */
export function proxyAtr1hPips(model: ChartModel, pipValue: number): number {
  if (model.lqzMatrix.length === 0) return 0;
  let minWidth = Infinity;
  for (const e of model.lqzMatrix) {
    const w = e.top - e.bottom;
    if (w > 0 && w < minWidth) minWidth = w;
  }
  return minWidth === Infinity ? 0 : (4 * minWidth) / pipValue;
}

/**
 * The mirror SL — inside the NEXT RUNG beyond the anchor in the TARGET
 * pair's OWN ladder, pair-native doctrine (§9.3):
 *   Law 7:  buffer in from the rung's NEAR edge (EUR 2 / GBP 3 / AUD 3 / DXY 5).
 *   Law 10: never tighter than max(0.5×ATR(1H), buffer) from entry.
 *   D17:    |entry − sl| > 36 pips → walk to the next rung; none within
 *           36 → null (the mirror's SL is invalid → discard).
 * Candidate preference replicates the canon anchor chain
 * (visual-setup-generator.ts:1139-1182): LQZ rungs first (nearest-first),
 * then all other rungs (nearest-first) — §8.1 keeps passive rungs valid
 * as SL/TP anchors (never entries).
 *
 * EXPORTED (v4.4.0c): the source-setup generator (setup-gen.ts) places the
 * source SL through this SAME function — SL doctrine is one code path.
 */
export function computeMirrorSL(
  entry: number,
  anchor: ZoneModel,
  direction: 'LONG' | 'SHORT',
  ladder: ScaffoldRung[],
  pair: string,
  pipValue: number,
  atr1hPips: number,
): { sl: number; method: string; rungId: string } | null {
  const bufferPips = LAW7_SL_BUFFER_PIPS[pair] ?? 3;
  const buffer = bufferPips * pipValue;

  const adverse = (r: ScaffoldRung): boolean =>
    direction === 'LONG' ? r.top <= anchor.bottom : r.bottom >= anchor.top;
  const nearestFirst = (a: ScaffoldRung, b: ScaffoldRung): number =>
    (direction === 'LONG' ? b.top - a.top : a.bottom - b.bottom) || cmpId(a, b);

  const lqzCandidates = ladder.filter((r) => r.source === 'LQZ' && adverse(r)).sort(nearestFirst);
  const restCandidates = ladder.filter((r) => r.source !== 'LQZ' && adverse(r)).sort(nearestFirst);
  const candidates = [...lqzCandidates, ...restCandidates];

  for (const rung of candidates) {
    let sl = direction === 'LONG' ? rung.top - buffer : rung.bottom + buffer;
    let method = rung.source === 'LQZ' ? 'next-lqz-rung' : 'next-structural-rung';

    // Sanity: the SL must sit on the ADVERSE side of entry (a rung
    // overlapping the anchor can produce a same-side stop — skip it).
    if (direction === 'LONG' && sl >= entry) continue;
    if (direction === 'SHORT' && sl <= entry) continue;

    // Law-10 floor (skipped when ATR unknown — canon).
    if (atr1hPips > 0) {
      const minDistPips = Math.max(LAW10_ATR_FRACTION * atr1hPips, bufferPips);
      if (Math.abs(entry - sl) / pipValue < minDistPips) {
        sl = direction === 'LONG' ? entry - minDistPips * pipValue : entry + minDistPips * pipValue;
        method += '+law10-floor';
      }
    }

    // D17 ceiling — HARD; walk to the next rung (§9.6 Stage 2 task spec).
    if (Math.abs(entry - sl) / pipValue > D17_SL_CEILING_PIPS) continue;

    return { sl, method, rungId: rung.id };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// v4.5.x REFINEMENT 1 — THE TP-WALL REFINEMENT (the golden TP doctrine)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * isWeakTpWall — the TP-wall strength vote (v4.5.x Refinement 1). The
 * golden TP placement targets the STRONGER opposing rung (the range-top
 * BoM supply), passing through weaker conditional walls; the Law-14
 * doctrine is PRESERVED: an UNMITIGATED STRONG zone (UM BoM, liquidity
 * Score ≥ 5) still caps — the refinement only relaxes WEAK walls.
 *
 *   WEAK votes (each +1):   MoM with reactionCount ≤ 1 (a minor, lightly
 *                           tested wall); liquidityScore < 5 (no Earth+
 *                           Fire liquidity); zfp > 30 (a heavily-worked
 *                           shelf — conditional, not a Hard Wall).
 *   STRONG votes (each +1): UM BoM (BoM && reactionCount === 0 — the
 *                           unmitigated break-of-move origin);
 *                           liquidityScore ≥ 5 (the liquidity magnet);
 *                           zfp < 20 (the fresh Hard Wall, Law-20).
 *
 * A wall is WEAK ⟺ weakVotes > strongVotes; ties resolve STRONG (Law-14
 * conservatism: a wall in doubt is respected, never passed through).
 * The measured case (the v4.5.0 defect): the 101.054 LQZ wall — MoM
 * rc 1 (+1 weak), zfp 35 (+1 weak), liq 35 (+1 strong) → 2v1 WEAK →
 * PASS-THROUGH; the 101.208 rung — MoM rc 1 (+1 weak), liq 30 (+1
 * strong), zfp 30 (neutral) → 1v1 tie → STRONG → the golden
 * ~101.19/101.21 range-top target. Deterministic, total, cited.
 */
export function isWeakTpWall(r: ScaffoldRung): boolean {
  const weak =
    (r.classification === 'MoM' && r.reactionCount <= 1 ? 1 : 0) +
    (r.liquidityScore < 5 ? 1 : 0) +
    (r.zfp > 30 ? 1 : 0);
  const strong =
    (r.classification === 'BoM' && r.reactionCount === 0 ? 1 : 0) +
    (r.liquidityScore >= 5 ? 1 : 0) +
    (r.zfp < 20 ? 1 : 0);
  return weak > strong;
}

/** The TP walk's refinement options (v4.5.x — ADDITIVE; default = the v4.4/v4.5.0 semantics). */
export interface MirrorTpOptions {
  /**
   * passThroughWeakWalls — Refinement 1 ON: WEAK walls (isWeakTpWall)
   * are PASS-THROUGH — they can neither CAP the Law-14 walk nor serve as
   * the walk's terminal target; the TP caps at the first STRONG opposing
   * rung (the significance-ranked rung, FURTHER than the weak cap).
   * Default FALSE (the frozen v4.4 semantics — the v4.4 lane and the
   * frozen-canon harnesses are byte-identical).
   */
  passThroughWeakWalls?: boolean;
  /**
   * Wave H1 (2026-08-01, FIX PLAN §2.2 STEP 4) — the MoM-to-BoM EXTENSION:
   * the walk's TP NEVER stops at a MoM shelf when a structurally-equivalent
   * BoM wall exists beyond it (the operator: "extend TP from MoM to BoM —
   * nice it adds an extra 2 R"). Fires on the EU/GU mirror lane only
   * (reAnchorMirror opts it in); the DXY source lane (setup-gen's calls
   * pass passThroughWeakWalls only) is byte-identical.
   */
  structuralExtension?: boolean;
  /**
   * Wave ZR-3.4 (2026-08-04 — the D37 #1 killer) — the E1-PRESSURE WALL
   * CLASSIFICATION: the cap-walk's "fresh wall" predicate switches from the
   * candle-count zfp ladder (zfp ≤ 20 — the canon LQZ ladder FLOORS at 20,
   * so EVERY rung qualified and the walk stopped at the NEAREST shelf) to
   * isStructuralWall (the E1 pressure state: lifecycle + confluence). The
   * shallow LQZ shelves (LMV-bridge, confluence 0, non-fortress) become
   * PASS-THROUGH. Also arms the ZR-3.2 strength-driven TP edge on the
   * walk's targets. "significance is based on E1 first, E2 second, candle
   * mechanics third." Fires on the EU/GU mirror lane ONLY (reAnchorMirror
   * opts it in) — the DXY source lane (setup-gen's calls pass no flag) is
   * byte-identical.
   */
  e1PressureClassification?: boolean;
}

/**
 * The mirror TP — the opposing rung of significance in the TARGET's
 * ladder via the Law-14 walk (§9.3, canon semantics
 * visual-setup-generator.ts:1289-1409 replicated over ScaffoldRung[]):
 *   Significance: UM BoM (+100) > liquidityScore ≥ 5 (+50) > BoM (+25) >
 *     MoM ≤1x (+15) > other; depleted (3x+, −100) excluded (sig ≤ −50).
 *   Law-14 walk: pass through MITIGATED rungs freely; the first
 *     effectively-UNMITIGATED rung with REAL freshness between entry and
 *     target CAPS the TP — UNLESS the capped TP itself fails the
 *     viable-RRR precondition (a cap that cannot pay is skipped, not
 *     rejected — v4.4.0c). Real freshness = ORDER_BLOCK / LQZ source or
 *     BoM/MoM classification — passive rungs (PIVOT/MA/FIB/SWING/
 *     OPTION_WALL) are pass-through per the defect-E doctrine (their
 *     strength is priced into significance, not freshness).
 *   v4.5.x Refinement 1 (opts.passThroughWeakWalls): WEAK walls
 *     (isWeakTpWall) are pass-through as BOTH caps and terminal targets —
 *     the TP targets the first STRONG opposing rung (the golden
 *     range-top doctrine); UM BoM / liquidity ≥ 5 unmitigated rungs
 *     still cap (Law 14 preserved).
 *   Law 12: TP timeframe ≥ anchor timeframe.
 *   Law 11/33: liquidityScore ≥ 5 → TP at the rung MIDPOINT; else NEAR edge.
 *   Law 13 (weekly-ATR sanity): SKIPPED — the ChartModel carries no bars,
 *     so weekly ATR is unknown; canon treats unknown as "no constraint"
 *     (visual-setup-generator.ts:1400-1402).
 *   Simulated mitigation (prior-setups consumption): NOT APPLICABLE —
 *     that is the frozen generator's report-SEQUENCE mechanic; the mirror
 *     walks the model's static freshness (documented deviation).
 *
 * EXPORTED (v4.4.0c): the source-setup generator (setup-gen.ts) targets
 * through this SAME Law-14 walk — TP doctrine is one code path.
 */
export function computeMirrorTP(
  entry: number,
  sl: number,
  anchor: ZoneModel,
  direction: 'LONG' | 'SHORT',
  ladder: ScaffoldRung[],
  pipValue: number,
  opts?: MirrorTpOptions,
): { tp: number; rungId: string } | null {
  const slDistPips = Math.abs(entry - sl) / pipValue;
  if (slDistPips <= 0) return null;
  const minTpDistPips = MIN_TP_SL_RATIO * slDistPips;
  const weakPass = opts?.passThroughWeakWalls === true;

  const opposing = ladder.filter((r) =>
    direction === 'LONG'
      ? (r.type === 'SUPPLY' || r.type === 'LIQUIDITY') && r.bottom > entry
      : (r.type === 'DEMAND' || r.type === 'LIQUIDITY') && r.top < entry);
  if (opposing.length === 0) return null;

  const significance = (r: ScaffoldRung): number => {
    let s = 0;
    if (r.classification === 'BoM' && r.reactionCount === 0) s += 100; // UM BoM
    if (r.liquidityScore >= 5) s += 50;                                // Earth+Fire
    if (r.classification === 'BoM') s += 25;
    if (r.classification === 'MoM' && r.reactionCount <= 1) s += 15;
    if (r.reactionCount >= 3) s -= 100;                                // depleted
    return s;
  };
  const ranked = opposing
    .map((r) => ({ r, sig: significance(r), dist: Math.abs(mid(r) - entry) }))
    .filter((c) => c.sig > -50)
    // v4.5.x R1: a WEAK wall is never the terminal target — price passes
    // through it to the first STRONG opposing rung (the golden doctrine).
    .filter((c) => !weakPass || !isWeakTpWall(c.r))
    .sort((a, b) => (b.sig - a.sig) || (a.dist - b.dist) || cmpId(a.r, b.r));

  /**
   * The cap-walk's REAL-freshness predicate: ORDER_BLOCK / LQZ source or
   * BoM/MoM classification — passive rungs (PIVOT/MA/FIB/SWING/
   * OPTION_WALL) are pass-through per the defect-E doctrine (their
   * strength is priced into significance, not freshness).
   */
  const hasRealFreshness = (r: ScaffoldRung): boolean =>
    r.source === 'ORDER_BLOCK' || r.source === 'LQZ' ||
    r.classification === 'BoM' || r.classification === 'MoM';

  /**
   * Cap-skip set (v4.4.0c — the real-bars correction): a cap rung whose
   * own capped TP fails the viable-RRR precondition is SKIPPED for the
   * remaining candidates ("targets that cannot pay for the risk are
   * skipped, not rejected" — canon 1304 applied TO THE CAP: a freshness
   * wall 2-12 pips from entry is not a target, it is noise relative to
   * the risk). WITHOUT this the harvested week's rejection-defended
   * shelves (sweep-count 0 = effectively unmitigated) capped EVERY walk
   * to the adjacent few pips and the whole EU lane went TP_NULL (28/28).
   * The verified synthetic contract is preserved EXACTLY: the G1
   * compressed shelf (11 pips vs the 9.6-pip precondition) still BINDS —
   * only caps that fail the precondition are passed through.
   */
  const skippedCapIds = new Set<string>();

  for (const { r: target } of ranked) {
    // Law 12: TP timeframe ≥ anchor timeframe.
    if ((TF_RANK[target.timeframe] ?? 0) < (TF_RANK[anchor.timeframe] ?? 0)) continue;

    // Law-14 walk: the nearest effectively-unmitigated rung with real
    // freshness between entry and target caps the TP.
    const targetMid = mid(target);
    const umBetween = ladder
      .filter((r) => {
        if (r.id === target.id || !hasRealFreshness(r) || r.reactionCount !== 0) return false;
        if (skippedCapIds.has(r.id)) return false;
        // v4.5.x R1: a WEAK wall never caps — price passes through it.
        if (weakPass && isWeakTpWall(r)) return false;
        const m = mid(r);
        return direction === 'LONG' ? (m > entry && m < targetMid) : (m < entry && m > targetMid);
      })
      .sort((a, b) =>
        (direction === 'LONG' ? mid(a) - mid(b) : mid(b) - mid(a)) || cmpId(a, b));
    const effective = umBetween.length > 0 ? umBetween[0]! : target;

    // Law 11/33: midpoint when liquid, near edge otherwise.
    const tp = effective.liquidityScore >= 5
      ? mid(effective)
      : (direction === 'LONG' ? effective.bottom : effective.top);

    // Direction sanity + viable-RRR precondition (skip, not reject).
    if (direction === 'LONG' && tp <= entry) continue;
    if (direction === 'SHORT' && tp >= entry) continue;
    if (Math.abs(tp - entry) / pipValue < minTpDistPips) {
      // A CAP that cannot pay is noise — pass through it for the rest of
      // the walk (the target itself may still bind further out).
      if (effective.id !== target.id) skippedCapIds.add(effective.id);
      continue;
    }

    // ── Wave H1 MoM-to-BoM extension (FIX PLAN §2.2 STEP 4): never stop
    //    at a MoM-class shelf when a structurally-equivalent BoM-class
    //    rung exists BEYOND it (the ladder's classification carries the
    //    BoM/MoM element). EU/GU mirror lane only (opt-in — the DXY
    //    source lane's computeMirrorTP calls are byte-identical). ──
    if (opts?.structuralExtension === true && effective.classification !== 'BoM') {
      const bomRung = ladder
        .filter((r) =>
          r.classification === 'BoM' &&
          (direction === 'LONG' ? r.bottom > effective.bottom : r.top < effective.top))
        .sort((a, b) =>
          (direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top) || cmpId(a, b))[0];
      if (bomRung) {
        const extTp = bomRung.liquidityScore >= 5
          ? mid(bomRung)
          : (direction === 'LONG' ? bomRung.bottom : bomRung.top);
        const extSane = direction === 'LONG' ? extTp > entry : extTp < entry;
        if (extSane && Math.abs(extTp - entry) / pipValue >= minTpDistPips) {
          return { tp: extTp, rungId: bomRung.id };
        }
      }
    }

    return { tp, rungId: effective.id };
  }
  return null;
}

/** The TARGET's own session at the anchor (§9.3 timing drift) — the
 * latest reaction event's session; null when the anchor was never
 * touched in the model's window (honest — the target's bars never came). */
function sessionOfTouch(anchor: ZoneModel): SessionLabel | null {
  let latest: ZoneModel['reactionEvents'][number] | null = null;
  for (const ev of anchor.reactionEvents) {
    if (!latest || ev.lastTouchMs > latest.lastTouchMs) latest = ev;
  }
  return latest ? latest.session : null;
}

/**
 * buildMirror — construct ONE mirror trade on the target pair's own
 * geometry (§9.3 / §9.6 Stage 2).
 *
 * SIGNATURE NOTE (documented deviation): the mandated signature types the
 * source as TradeSetup; §9.6 Stage 3 threads the EU MIRRORS as the GU
 * sources (`guMirrors = euAll.map(s => mirrorInto(s, models.GU, …))`), so
 * the parameter is the union `TradeSetup | MirrorOutcome`. A TradeSetup
 * source inverts direction when source.pair === 'DXY'; a MirrorOutcome
 * source (pair 'EUR/USD') keeps it — the same rule, one code path.
 */
export function buildMirror(
  source: TradeSetup | MirrorOutcome,
  anchor: ZoneModel,
  targetModel: ChartModel,
  targetPair: string,
): MirrorOutcome {
  const pipValue = PIP_VALUE[targetPair] ?? PIP_VALUE_DEFAULT;
  const category = sourceCategoryOf(source);
  const mirrorOf = mirrorOfOf(source);
  const srcDir = sourceDirectionOf(source);
  const session = sessionOfTouch(anchor);

  const base = {
    sourceSetupId: sourceIdOf(source),
    anchorZoneId: anchor.id,
    pair: targetPair,
    category,
    session,
    mirrorOf,
  };
  const inert = (status: MirrorStatus, discardReason: string): MirrorOutcome => ({
    ...base,
    direction: srcDir === 'NEUTRAL' ? 'LONG' : srcDir,
    entry: anchor.top,
    sl: anchor.top,
    tp: anchor.top,
    rrr: 0,
    status,
    discardReason,
    slMethod: 'none',
    tpRungId: null,
  });

  // A directionless source cannot be mirrored (totality — honest invalid).
  if (srcDir === 'NEUTRAL') {
    return inert('SOURCE_INVALID',
      `${targetPair} mirror of ${mirrorOf}: source direction NEUTRAL — cannot mirror a directionless setup`);
  }

  // §9.3: DXY→EU INVERTS; EU→GU KEEPS (EU and GU move together).
  const direction: 'LONG' | 'SHORT' =
    source.pair === 'DXY' ? (srcDir === 'LONG' ? 'SHORT' : 'LONG') : srcDir;

  // Entry = the anchor zone's entry edge (same edge semantics as the
  // frozen generator, gen:1082-1091 front edge): ceiling for demand-long,
  // floor for supply-short. NO forward spread — the spread is the live
  // lane's fill-guarantee mechanic; the mirror maps structure.
  const entry = direction === 'LONG' ? anchor.top : anchor.bottom;

  // ── SL: the next rung beyond the anchor in the TARGET's ladder ──
  const atr1hPips = proxyAtr1hPips(targetModel, pipValue);
  const slResult = computeMirrorSL(entry, anchor, direction, targetModel.ladder, targetPair, pipValue, atr1hPips);
  if (!slResult) {
    return {
      ...inert('SL_INVALID',
        `${targetPair} mirror of ${mirrorOf}: no rung within the D17 ${D17_SL_CEILING_PIPS}-pip ceiling beyond the anchor — SL invalid after the rung walk`),
      direction, entry,
    };
  }

  // ── TP: the opposing rung of significance via the Law-14 walk ──
  const tpResult = computeMirrorTP(entry, slResult.sl, anchor, direction, targetModel.ladder, pipValue);
  if (!tpResult) {
    return {
      ...inert('TP_NULL',
        `${targetPair} mirror of ${mirrorOf}: no opposing rung of significance passes the Law-14 walk (viable-RRR precondition ≥ ${MIN_TP_SL_RATIO}× SL)`),
      direction, entry, sl: slResult.sl, slMethod: slResult.method,
    };
  }

  // ── RRR on the TARGET pair's actual geometry (single-entry — documented) ──
  const rrr = Math.abs(tpResult.tp - entry) / Math.abs(entry - slResult.sl);
  // The RRR floor is the category's canon floor (rrrForCategory — now 3.0 for
  // every category, the R1 table). R2 (Phase 7): an RRR-failed mirror is NOT a
  // hard reject — the refinement machine repairs the E/SL/TP on the same zone
  // anchors (see reAnchorMirror's RRR_DISCARDED path).
  const floor = rrrForCategory(category).tp1;
  const status: MirrorStatus = rrr >= floor ? 'ACTIVE' : 'RRR_DISCARDED';
  // ── Wave J1: the rejection reason is a HALLUCINATION TRIGGER (the
  //    operator's canonical banned phrase — D34). The detector flags it and
  //    the layer-evidenced alternative is produced from the geometry (the
  //    REAL cause: the anchor + the TP, never the pair's candles). ──
  let discardReason: string | undefined;
  if (status === 'RRR_DISCARDED') {
    const raw = `${targetPair} mirror of ${mirrorOf}: RRR ${rrr.toFixed(1)} < ${floor} after re-anchor — ${targetPair} candles smaller on this move`;
    let flagged: HallucinationVerdict | null = null;
    try {
      flagged = detectHallucination(raw, {
        zoneId: anchor.id,
        price: entry,
        delta: Math.abs(tpResult.tp - entry),
        layerCheck: 'T6',
        rungId: anchor.id,
      });
    } catch { flagged = null; }
    if (flagged && flagged.triggered) {
      // The layer-evidenced reason — the geometry over the claim.
      discardReason = `${targetPair} mirror of ${mirrorOf}: RRR ${rrr.toFixed(2)} < floor ${floor} — T6 FAIL (the E/SL/TP geometry: E ${entry.toFixed(5)} SL ${slResult.sl.toFixed(5)} TP ${tpResult.tp.toFixed(5)}); the anchor ${anchor.id} and the TP path need the 3D audit (C1-C6/T1-T8)`;
      try { recordLayerCause('T6'); } catch { /* non-fatal */ }
    } else {
      discardReason = raw;
    }
    try {
      writeRejectedSetup({
        setupId: mirrorOf ?? undefined,
        run: targetModel.anchor?.weekStartMs !== undefined && targetModel.anchor?.weekStartMs !== null ? runIdOf(targetModel.anchor.weekStartMs) : undefined,
        pair: targetPair,
        lane: 'MIRROR',
        direction,
        entry, sl: slResult.sl, tp: tpResult.tp,
        rrrComputed: rrr, rrrFloor: floor,
        rejectionReason: discardReason,
        hallucinationTrigger: flagged?.triggered ?? false,
        sourceSetupId: mirrorOf ?? undefined,
        sourceZone: anchor ? { id: anchor.id } : undefined,
        designatedZone: anchor ? { id: anchor.id } : undefined,
        opposingBoMWall: tpResult.rungId ? { id: tpResult.rungId } : undefined,
        verdict: 'REFINE',
      }, { weekStartMs: targetModel.anchor?.weekStartMs });
    } catch { /* non-fatal — a log failure never kills the pipeline */ }
  }

  return {
    ...base,
    direction,
    anchorZoneId: anchor.id,
    entry,
    sl: slResult.sl,
    tp: tpResult.tp,
    rrr,
    status,
    discardReason,
    slMethod: slResult.method,
    tpRungId: tpResult.rungId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3 — THE CASCADE (§9.6 Stage 3) + THE MIRROR-FLOOR CONTRACT (§11)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bind a source TradeSetup to its anchor zone in the SOURCE model.
 * Direction-consistent (LONG↔DEMAND, SHORT↔SUPPLY — TTE v5.3.3 #14:
 * direction comes from ZONE TYPE); entry containment first, then nearest
 * mid within the canon 10-pip edge tolerance. null → the caller logs a
 * FAILED anchor (honest — never a guessed zone).
 */
function resolveSourceZone(setup: TradeSetup, sourceModel: ChartModel): ZoneModel | null {
  const dir = String(setup.direction);
  const wantType = dir === 'LONG' ? 'DEMAND' : 'SUPPLY';
  const pipValue = PIP_VALUE[sourceModel.pair] ?? PIP_VALUE_DEFAULT;
  const tol = SOURCE_ZONE_TOLERANCE_PIPS * pipValue;
  const candidates = sourceModel.zones.filter((z) => z.type === wantType);

  const containing = candidates
    .filter((z) => setup.entry >= z.bottom - tol && setup.entry <= z.top + tol)
    .sort((a, b) =>
      (Math.abs(mid(a) - setup.entry) - Math.abs(mid(b) - setup.entry)) || cmpId(a, b));
  if (containing.length > 0) return containing[0]!;

  const near = candidates
    .map((z) => ({ z, d: Math.abs(mid(z) - setup.entry) }))
    .filter((c) => c.d <= tol)
    .sort((a, b) => (a.d - b.d) || cmpId(a.z, b.z));
  return near.length > 0 ? near[0]!.z : null;
}

/**
 * cascade — DXY setups → EU mirrors (inverse) → GU mirrors (kept).
 *
 * euMirrors = every DXY setup mirrored into the EU model (ACTIVE +
 * RRR_DISCARDED tracked; FAILED anchors logged separately, §9.2 rule 4).
 * guMirrors = the ACTIVE EU mirrors mirrored into the GU model (§9.6
 * Stage 3 — only ACTIVE mirrors cascade; an EU discard never propagates).
 * The emergent lane merges ON TOP downstream (§9.4) — this module is the
 * mirror FLOOR only; it never invents setups.
 */
export function cascade(
  dxySetups: TradeSetup[],
  models: { DXY: ChartModel; 'EUR/USD': ChartModel; 'GBP/USD': ChartModel },
): MirrorCascadeResult {
  const EU = 'EUR/USD';
  const GU = 'GBP/USD';
  const eu: MirrorOutcome[] = [];
  const gu: MirrorOutcome[] = [];
  const failedAnchors: FailedAnchor[] = [];

  const dxyFromSpot = zonesFromSpot(models.DXY.zones, models.DXY.spot);
  const euFromSpot = zonesFromSpot(models[EU].zones, models[EU].spot);

  // ── DXY → EU (inverse direction, inverse-type anchor) ──
  for (const setup of dxySetups) {
    const dir = String(setup.direction);
    if (dir !== 'LONG' && dir !== 'SHORT') {
      failedAnchors.push({
        sourceId: setup.setupId, targetPair: EU,
        reason: `SOURCE_DIRECTION_${dir}: cannot mirror a directionless setup`,
      });
      continue;
    }
    const srcZone = resolveSourceZone(setup, models.DXY);
    if (!srcZone) {
      failedAnchors.push({
        sourceId: setup.setupId, targetPair: EU,
        reason: `SOURCE_ZONE_UNRESOLVED: no ${dir === 'LONG' ? 'DEMAND' : 'SUPPLY'} zone within ${SOURCE_ZONE_TOLERANCE_PIPS}p of entry ${setup.entry}`,
      });
      continue;
    }
    const anchor = findMirrorAnchor(srcZone, models[EU].zones, models[EU].spot, dxyFromSpot);
    if (!anchor) {
      failedAnchors.push({
        sourceId: setup.setupId, targetPair: EU,
        reason: `NO_STRUCTURAL_EQUIVALENT: no ${srcZone.type === 'SUPPLY' ? 'DEMAND' : 'SUPPLY'} zone on ${EU} (formation-time ±24h + rank fallback exhausted)`,
      });
      continue;
    }
    eu.push(buildMirror(setup, anchor, models[EU], EU));
  }

  // ── EU → GU (kept direction, same-type anchor) — ACTIVE EU mirrors only ──
  for (const m of eu) {
    if (m.status !== 'ACTIVE') continue;
    const srcZone = models[EU].zones.find((z) => z.id === m.anchorZoneId) ?? null;
    if (!srcZone) {
      failedAnchors.push({
        sourceId: m.sourceSetupId, targetPair: GU,
        reason: `SOURCE_ZONE_MISSING: EU anchor ${m.anchorZoneId} not present in the EU model`,
      });
      continue;
    }
    const anchor = findAnchorKeepType(srcZone, euFromSpot, models[GU].zones, models[GU].spot);
    if (!anchor) {
      failedAnchors.push({
        sourceId: m.sourceSetupId, targetPair: GU,
        reason: `NO_STRUCTURAL_EQUIVALENT: no ${srcZone.type} zone on ${GU} (formation-time ±24h + rank fallback exhausted)`,
      });
      continue;
    }
    gu.push(buildMirror(m, anchor, models[GU], GU));
  }

  const discarded = [...eu, ...gu].filter((m) => m.status !== 'ACTIVE');
  return { eu, gu, failedAnchors, discarded };
}

/**
 * checkMirrorFloor — the §11 mirror-floor MathContract, mechanized.
 * Violation → the pipeline ABORTS with the violated contract + evidence
 * (this function returns the evidence; the caller aborts).
 *
 *   INVARIANT 1: |EU.activeMirrors| ≥ |DXY.active| − |EU.failedAnchors|
 *     (EU can only lose a mirror to a FAILED anchor, logged — §9.6; EU's
 *     geometry is the inverted copy, so RRR casualties are NOT tolerated
 *     here — an EU discard without a failed anchor is a violation).
 *   INVARIANT 2: |GU.activeMirrors| ≥ |EU.activeMirrors| − |GU.discarded|
 *     (GU loses only to documented discards — the operator's casualty
 *     mechanism, §9.3).
 *   TEMPORAL:   G(discarded(m) → ∃ reason(m)) — every discard carries a
 *     logged reason, forever (§11 mirror-floor temporal clause).
 */
export function checkMirrorFloor(
  result: MirrorCascadeResult,
  dxyActiveCount: number,
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const euActive = result.eu.filter((m) => m.status === 'ACTIVE').length;
  const euFailed = result.failedAnchors.filter((f) => f.targetPair === 'EUR/USD').length;
  if (euActive < dxyActiveCount - euFailed) {
    violations.push(
      `CONTRACT mirror-floor[EU]: |EU.activeMirrors|=${euActive} < |DXY.active|=${dxyActiveCount} − |EU.failedAnchors|=${euFailed}` +
      ` — undocumented EU casualty (§11); evidence: eu=[${result.eu.map((m) => `${m.sourceSetupId}:${m.status}`).join(',')}]` +
      ` failedAnchors=[${result.failedAnchors.map((f) => `${f.sourceId}→${f.targetPair}`).join(',')}]`,
    );
  }
  const guActive = result.gu.filter((m) => m.status === 'ACTIVE').length;
  const guDiscarded = result.gu.filter((m) => m.status !== 'ACTIVE').length;
  if (guActive < euActive - guDiscarded) {
    violations.push(
      `CONTRACT mirror-floor[GU]: |GU.activeMirrors|=${guActive} < |EU.activeMirrors|=${euActive} − |GU.discarded|=${guDiscarded}` +
      ` — undocumented GU casualty (§11); evidence: gu=[${result.gu.map((m) => `${m.sourceSetupId}:${m.status}`).join(',')}]`,
    );
  }
  for (const m of result.discarded) {
    if (!m.discardReason) {
      violations.push(
        `CONTRACT mirror-floor[temporal]: discarded mirror ${m.pair}:${m.sourceSetupId} (${m.status}) has NO discardReason` +
        ` — G(discarded → ∃reason) violated (§11)`,
      );
    }
  }
  return { ok: violations.length === 0, violations };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE STRUCTURAL-ANCHOR GATE (§8.1 — the RESOLVED passive-level ruling)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * isValidEntryAnchor — the slop-killer gate (§8.1 rulings 1+2). This is
 * what kills the DXY=39 passive-level slop: passive pillar levels NEVER
 * produce entries, and even a structural zone produces an entry only
 * when price BATTLED at its entry band (rejection anatomy — a
 * PASS_THROUGH crossing is noise, not a reaction).
 *
 *   structural(zone) ⟺ zone.source ∈ {ORDER_BLOCK, LQZ}
 *     (a ZoneModel carries no source field — buildZoneMap emits ONLY
 *      OB-derived zones, §6.1, so a ZoneModel is structural BY
 *      CONSTRUCTION; rung-shaped inputs ({source, top, bottom}) are
 *      checked against STRUCTURAL_ENTRY_SOURCES).
 *   battled(zone, dayBars) ⟺ ∃ bar in dayBars whose interaction with the
 *     entry band classifies to SWEEP / WICK_REJECT / BODY_DEFEND /
 *     CONSOL_DWELL (the §6.2.1 classifyTouch TOTAL predicate, imported —
 *     never re-implemented). PASS_THROUGH = noise (§8.1 ruling 2).
 *
 * The entry band (§8.4.1): LONG → [zone.bottom − Law7 buffer, zone.top]
 * (price must dip INTO the zone — the ceiling is the entry edge);
 * SHORT → [zone.bottom, zone.top + Law7 buffer].
 *
 * (Ruling 3 — shape alignment — is Engine 2's consumption, Wave C; this
 * gate is the structural + battle precondition, exported for Wave C.)
 */
export function isValidEntryAnchor(
  zone: ZoneModel | { source: string; top: number; bottom: number },
  dayBars: OHLCBar[],
  direction: 'LONG' | 'SHORT',
  pair: string,
): AnchorGateResult {
  const src = (zone as { source?: string }).source;
  const structural = src === undefined ? true : STRUCTURAL_ENTRY_SOURCES.has(src);
  if (!structural) {
    return {
      valid: false,
      reason: `PASSIVE_SOURCE(${src}): passive pillar levels (PIVOT/MA/OPTION_WALL/FIB_RETRACE/SWING_EXTREME)` +
        ` are rungs/SL-TP anchors/confluence only, NEVER entries (§8.1 ruling 1 — the DXY=39 slop-killer)`,
    };
  }

  const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
  const buffer = (LAW7_SL_BUFFER_PIPS[pair] ?? 3) * pipValue;
  const lo = direction === 'LONG' ? zone.bottom - buffer : zone.bottom;
  const hi = direction === 'LONG' ? zone.top : zone.top + buffer;

  const ctx = { atr: computeAtr(dayBars, 14), pipValue };
  const battles = new Set<string>();
  for (let i = 0; i < dayBars.length; i++) {
    const kind = classifyTouch(dayBars, i, lo, hi, ctx);
    if ((BATTLE_KINDS as readonly string[]).includes(kind)) battles.add(kind);
  }
  if (battles.size === 0) {
    return {
      valid: false,
      reason: 'NO_BATTLE: only PASS_THROUGH traversal (or no touch) at the entry band' +
        ' — noise, not a reaction (§8.1 ruling 2)',
    };
  }
  return {
    valid: true,
    reason: `OK: structural anchor battled at the entry band [${[...battles].sort().join('+')}]`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// v4.5 — THE MIRROR RE-ANCHOR + THE COMMON-SENSE GUARDS
// (PLUTUS_V4.5_SPEC §5 Fix 3, §6 Fix 4, §7 Fix 5)
// ═══════════════════════════════════════════════════════════════════════════════
//
// THE 80/20 DOCTRINE (Appendix A, the operator verbatim, canon):
//   "The mirror is not per pip precision. The mirror is for the trade setup
//    direction, shape, and zone class of entry + TP. 80%. The remaining 20%
//    like specific entry/SL/TP levels and anchors within the mirror cascade
//    must be optimized for the actual pair being traded on. obviously.
//    cannot be a blind mirror."
//   "You are mirroring zone CLASS not literal zone. If DXY moves from BoM EU
//    moves from BoM — you must match to the relevant BoM zone that is
//    specific to EU's actual price action pair-native storyline. DXY is only
//    giving a SIGNAL with high accuracy not a blind copy paste trade."
//
//   80% (the signal, ALWAYS followed): DIRECTION (inverse DXY→EU, same
//     EU→GU), SHAPE, ZONE CLASS (BoM→BoM, MoM→MoM, LQZ→LQZ).
//   20% (pair-native optimization, ALWAYS adapted): the specific E/SL/TP
//     LEVELS — re-anchored to the target's OWN strong zone + a
//     volatility-aware (reaction-extreme) SL.
//
// Everything below is ADDITIVE. The v4.4 lane (findMirrorAnchor /
// buildMirror / cascade / checkMirrorFloor) is preserved byte-for-byte —
// the v4.4 cascade contract (verify-cascade 13/13) is untouched.
// ═══════════════════════════════════════════════════════════════════════════════

/** The mirrored zone class (the 80% signal's class component). */
export type ZoneClass = 'BoM' | 'MoM' | 'LQZ';

/**
 * The v4.5 mirror outcome — the v4.4 MirrorOutcome plus the re-anchor
 * provenance (the pair-native zone's class/kind/anchors, the trade's
 * target-native timestamp, and the common-sense flags).
 */
export interface MirrorOutcomeV45 extends MirrorOutcome {
  /** The 80% signal's zone class (from the source setup's zoneType). */
  zoneClass: ZoneClass;
  /** The re-anchored zone's kind: an OB-derived ZoneModel or an LMV LqzZoneMatrix. */
  anchorKind: 'ORDER_BLOCK' | 'LQZ';
  /** The anchor's formation ms (OB formationMs / LMV first reaction candle). */
  anchorFormationMs: number;
  /** The anchor's zfp (the narrative gate's strength input, §7.2). */
  anchorZfp: number;
  /** The LMV defendedEdge the entry anchors to (=== entry when LMV-backed). */
  anchorDefendedEdge: number;
  /** The LMV reactionExtreme the SL clears (null only on the no-LMV fallback). */
  anchorReactionExtreme: number | null;
  /** The trade's target-native ms: the anchor's LATEST reaction (§9.3 timing drift). */
  tradeMs: number;
  /** ISO day (UTC) of tradeMs — the narrative gate's day input. */
  tradeDay: string;
  /** Common-sense flags (COUNTER_STRUCTURE_FLAG, CS1_UNCHECKED — never silent). */
  flags: string[];
  /**
   * Wave I1 — the 3D REFINEMENT MACHINE's audit card (FIX PLAN §19.1) when
   * the cascade translation was threaded (ctx.translatedDays present). The
   * mechanical P1-P8/C1-C6/T1-T8 scaffolding + the verdict — the agent-facing
   * card the MANUAL REVIEW STAGE (Wave K) reasons over. Absent → the mirror
   * ran the pre-Wave-I lane (no 3D audit — byte-identical).
   */
  auditCard?: ThreeDAuditCard | null;
}

/** The v4.5 cascade result (same shape as v4.4 — the floor contract consumes it). */
export interface MirrorCascadeResultV45 {
  eu: MirrorOutcomeV45[];
  gu: MirrorOutcomeV45[];
  failedAnchors: FailedAnchor[];
  discarded: MirrorOutcomeV45[];
}

/** Optional runtime context for the re-anchored lane. */
export interface MirrorReanchorContext {
  /**
   * Session-start price provider: the OPEN of the first 1H bar of the
   * session containing `ms` on `pair` (null when no bar exists). Feeds the
   * MANDATORY CS-1 guard (§6.2). Absent provider → the guard is honestly
   * unchecked (flagged CS1_UNCHECKED, never silently skipped).
   */
  sessionStartPrice?: (pair: string, ms: number) => number | null;
  /**
   * v4.5.4 FIX 4 — day-open price provider for the onSide anchor gate:
   * the first 1H bar of the source's signal day on the target pair. The
   * mirror's onSide gate references THIS — not the week-anchor model spot.
   */
  dayOpenPrice?: (pair: string, dayStartMs: number) => number | null;
  /** Apply the §7 narrative-alignment gate? Default TRUE. */
  applyNarrativeGate?: boolean;
  /**
   * The SOURCE zone's formation ms (the ±24h preference input, §5.3 step 2).
   * The cascade resolves it from the source model; NaN/absent → the
   * formation-time preference is honestly skipped (pool = all class matches).
   */
  sourceFormationMs?: number;
  /**
   * v4.5.x REFINEMENT 3 — anchor ids the lane already consumed (the EU
   * pool-widening distribution): a subsequent source mapping to the SAME
   * anchor retries with the used anchors excluded → the NEXT-strongest
   * alive zone (the strongest is always preferred; distribution fires
   * only on a dedup collision).
   */
  excludedAnchorIds?: ReadonlySet<string>;
  /**
   * v4.5.2 refinements — additive flags controlling the mirror geometry
   * (golden SL LMV, consumed-pool qualifier, GU anchor pool). When all
   * are TRUE the cascade applies the full v4.5.2 refinement suite.
   */
  v452?: { goldenSlLmv?: boolean; consumedPoolQualifier?: boolean; guAnchorPoolV453?: boolean };
  /**
   * E2 shape day data — the shape-cascade's projected key zone for the
   * trade's day. When present, selectPairNativeZone PREFERS the E2-
   * designated zone over the spot-nearest heuristic. Optional — when
   * absent, the existing behavior is unchanged (additive/conditional).
   */
  shapeDay?: ShapeDayZone;
  /**
   * E2 shape chains (DXY + EU + GU — the PAIR BRAINS' E2 CORE days) —
   * passed from report-v452 to cascadeV45, which resolves per-day shapeDay
   * from the setup's day. The EU/GU lanes consume the PAIR BRAINS'
   * strength-based designations (E2 CORE), NOT the cascade's translated
   * days (the cascade VALIDATES ≤35% divergence — it never designates).
   * dxy is carried for completeness (the DXY lane's own designation is
   * unchanged; the cascade reads only eu/gu). Optional — when null/absent,
   * the cascade uses spot-price heuristics.
   */
  shapeChains?: { dxy?: CascadedShapeChain; eu: CascadedShapeChain; gu: CascadedShapeChain } | null;
  /**
   * Wave I1 — the CASCADE TRANSLATION days (the buildE2Core outputs — the
   * DXY-inverse map for EU, the EU-KEPT map for GU). The 3D REFINEMENT
   * MACHINE's Layer-2 substrate (the C1-C6 cascade checks + the RE_TRANSLATE
   * loop): "the translation input (the cascade days) is already computed in
   * report-v452.ts's buildE2Core — thread the TranslatedDayMap through the
   * mirror context so the machine can access it (small ctx field; null-guard
   * everything)." ABSENT → the mirror lane is byte-identical to the
   * pre-Wave-I behavior (no 3D audit — the golden diags measure that lane).
   */
  translatedDays?: { eu?: TranslatedDayMap | null; gu?: TranslatedDayMap | null } | null;
}

/**
 * The narrative gate's strength thresholds (§7.2, the operator's Law-20
 * interaction): suppression binds only WEAK zones (zfp > 30); a Hard Wall
 * (zfp < 20) is EXEMPT (counter-trend scalps valid at strong zones with 3+
 * confluences). The 20-30 middle band is allowed WITH the flag (documented
 * choice: the spec fixes the suppress band (>30) and the exempt band (<20);
 * between them the trade stands but is flagged for review).
 */
const ZFP_SUPPRESS_ABOVE = 30;

/**
 * The narrative ATR source = 4 × the LMV coverage bucket width.
 * BECAUSE: the LMV completeness grid (§2.3 Stage 4) fixes
 * bucketWidth = max(0.25 × ATR(14, 1H), 1 pip) — the model's OWN ATR-scaled
 * unit, so 4 × bucketWidth ≈ ATR(14, 1H) exactly (floored at 4 pips). The
 * alternative proxy (4 × narrowest zone width, the §7-ladder ATR proxy)
 * degenerates on single-point clusters (sub-pip widths → a 2-pip "ATR"),
 * which would silently neuter the §7.3 sweep-recovery radius. This source
 * is canon-derived, in-model, and deterministic.
 */
function narrativeAtrPips(model: ChartModel, pipValue: number): number {
  return (4 * model.lmv.coverage.bucketWidth) / pipValue;
}

/** ISO day key of a candle ms — the narrative gate's day-granularity input. */
function dayKeyOfMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Deterministic LMV-zone id (LMV rows carry no id — synthesized from the center). */
function lmvAnchorId(pair: string, z: LqzZoneMatrix): string {
  return `${pair}|LMV|${z.center.toFixed(priceDecimals(pair))}`;
}

/** Discriminate the re-anchored anchor union. */
function isLqzAnchor(a: ZoneModel | LqzZoneMatrix): a is LqzZoneMatrix {
  return 'reactionExtreme' in a;
}

/** The 80% signal's zone class from the source (TradeSetup zoneType / carried class). */
function zoneClassOf(source: TradeSetup | MirrorOutcomeV45): ZoneClass {
  if (isMirrorOutcome(source)) return source.zoneClass;
  const zt = String(source.zoneType ?? '');
  if (zt.startsWith('BoM')) return 'BoM';
  if (zt.startsWith('MoM')) return 'MoM';
  if (zt.startsWith('LSZ')) return 'LQZ';
  return source.isBoMEntry ? 'BoM' : 'MoM';
}

/** The source battle's approximate ms from the setup-gen shapeTrigger
 *  (`${anatomies} @ YYYY-MM-DD SESSION` — the §8.4 temporal identity).
 *  NaN when unparseable (honest — the ±24h preference is skipped). */
function shapeTriggerMs(trigger: string): number {
  const m = /@ (\d{4})-(\d{2})-(\d{2}) (TOKYO|LONDON|NY|OFF)$/.exec(trigger);
  if (!m) return NaN;
  const hour = m[4] === 'LONDON' ? 7 : m[4] === 'NY' ? 13 : m[4] === 'OFF' ? 21 : 0;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour);
}

// ═══════════════════════════════════════════════════════════════════════════════
// §5.3 — selectPairNativeZone (the heart of the re-anchor)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OB-zone significance tier (§5.3 step 3: "fresh BoM > liquidityScore ≥ 5 >
 * MoM ≤1x > other"). ZoneModel carries no liquidityScore — its 9-pillar
 * composite `confluence` is the model-native analog (0 without pillar data,
 * honest). VIOLATED structure (the §6.4 recurrence's TERMINAL state — the
 * level closed through) is EXCLUDED from candidacy BEFORE tiering in every
 * tier. DEPLETED structure is tiered DOWN (v4.5.x Refinement 2): it is
 * admissible only as the recently-battled fallback (battled within the
 * week — weakened but still reactive) or the rank/nearest fallback, never
 * ahead of an alive zone. This is the setup-gen temporal freshness gate
 * applied to the mirror anchor.
 */
function obSignificanceTier(z: ZoneModel): number {
  if (z.classification === 'BoM' && z.freshness === 'FRESH') return 3;
  if (z.confluence >= 5) return 2;
  if (z.classification === 'MoM' && (z.freshness === 'FRESH' || z.freshness === 'TESTED_1X')) return 1;
  return 0;
}

/**
 * LMV-zone significance tier (§5.3 "zfp-ranked"). The canon LQZ zfp ladder
 * starts at 20 for a CONFIRMED fresh zone and grows with touches — so a
 * LOW zfp is a fresh Hard Wall (Law-20), a high zfp a heavily-worked shelf.
 * Sweeps mark a liquidity grab at a still-alive zone (the stop-run the
 * reversal launches from).
 */
function lqzSignificanceTier(z: LqzZoneMatrix): number {
  if (z.zfp <= 20) return 3;
  if (z.sweepCount >= 1 && z.zfp <= 40) return 2;
  if (z.zfp <= 40) return 1;
  return 0;
}

interface PairNativeCandidate {
  kind: 'ORDER_BLOCK' | 'LQZ';
  ob: ZoneModel | null;
  lqz: LqzZoneMatrix | null;
  id: string;
  center: number;
  formationMs: number;
  tier: number;
  /**
   * v4.5.x R2 admissibility group (0 = alive, −1 = recently-battled
   * consumed, −2 = rank/nearest consumed). The group gates ALIVE vs
   * CONSUMED only — WITHIN the best group the §5.3 semantics are the
   * v4.5.0 ones, byte-for-byte (formation-time preference, then the
   * strength rank). A consumed zone NEVER outranks an alive one.
   */
  group: number;
}

/** The pair-native anchor matcher's refinement options (v4.5.x — ADDITIVE). */
export interface PairNativeZoneOptions {
  /**
   * v4.5.x REFINEMENT 3 — anchor ids the lane already consumed (the EU
   * pool-widening distribution): excluded from candidacy so a subsequent
   * source maps to the NEXT-strongest zone (the strongest is always
   * preferred; distribution only fires on a dedup collision).
   */
  excludedIds?: ReadonlySet<string>;
  /**
   * v4.5.x REFINEMENT 2 — the model's week bounds [weekStartMs, anchorMs]
   * (the recently-battled fallback's battle window). Absent → consumed
   * zones fall straight to the rank/nearest tier (no battle evidence).
   */
  week?: { weekStartMs: number; anchorMs: number };
  /**
   * v4.5.5 RE-PORT — the CLASS-FLEXIBLE LQZ FALLBACK (the GU-lane fix,
   * ADDITIVE, default OFF; PRISTINE :1200-1213). When the OB-class pool
   * offers NO alive (group 0) or recently-battled (group −1) candidate
   * AFTER exclusions, the target's LMV rungs (side-matched, on-side,
   * zfp-tiered) join candidacy at group −1.5 — between the OB
   * recently-battled tier and the OB rank/nearest tier. BECAUSE: GU's
   * trending week closes through every OB zone (the golden-week pool:
   * 25/26 supply VIOLATED, 1 DEPLETED) — the class-locked pool collapses
   * to ONE consumed anchor and the lane ×N-collapses onto it. The LMV
   * rungs are live liquidity structure (61 GU rungs, full coverage) — the
   * honest structural anchor when the OB pool is empty. VIOLATED stays
   * terminal; the OB tiers always outrank the fallback.
   */
  classFlexibleLQZFallback?: boolean;
}

/**
 * selectPairNativeZone — the pair-native anchor matcher (§5.3, EXACT).
 * Replaces the v4.4 formation-time-only findMirrorAnchor in the v4.5 lane:
 * matches by CLASS + SIDE + STRENGTH, with formation-time ±24h as a
 * PREFERENCE (not binding):
 *   1. CLASS MATCH — BoM/MoM from the target's OB zones (classification +
 *      type), LQZ from the LmvTable (side).
 *   2. SIDE — SHORT → SELL_SIDE supply ABOVE spot; LONG → BUY_SIDE demand
 *      BELOW spot (the CS-2 stale-anchor killer: shorting a supply the
 *      pair already moved through is the v4.4 EU failure).
 *   3. FORMATION-TIME ±24h — a pool PREFERENCE (same macro structure forms
 *      within a day on both charts); never a binding filter.
 *   4. STRENGTH RANK — significance tier desc, then |center − spot| asc,
 *      then id (total, deterministic).
 * Returns the target's OWN strongest relevant zone, or null (honest FAILED
 * anchor — the caller logs it; §9.2 rule 4).
 *
 * v4.5.x REFINEMENT 2 — the consumed-pool fallback (the GU lane): the
 * v4.5.0 gate admitted ONLY alive structure (VIOLATED/DEPLETED excluded),
 * which produced ZERO GU anchors when GU's supply was consumed by the
 * week's battles. The pool now GROUPS:
 *   GROUP 0 (alive):        FRESH / TESTED_1X / TESTED_2X — the strong zone
 *                          price actually reverses from (unchanged).
 *   GROUP −1 (recently-battled): DEPLETED with a battle INSIDE the
 *                          model's week — the zone is weakened but still
 *                          reactive (the week's battles prove the level is
 *                          live; a stale consumed zone is NOT this).
 *   GROUP −2 (rank/nearest): any remaining non-VIOLATED zone of the
 *                          class+type, nearest from spot — the §9.2
 *                          rule-3 rank fallback; the re-anchored SL is
 *                          volatility-checked at construction
 *                          (computeReactionExtremeSL volatilityClear).
 *   VIOLATED is TERMINAL in every group (a level that closed through
 *   never offers an entry — the recurrence's terminal state, §6.4).
 * The group gates ALIVE vs CONSUMED only — WITHIN the best group the
 * §5.3 formation-time preference + strength rank run exactly as v4.5.0
 * (the verified semantics); a consumed zone NEVER outranks an alive one
 * (the strength-rank is preserved, Appendix A).
 */
export function selectPairNativeZone(
  targetLmv: LmvTable,
  targetObZones: ZoneModel[],
  zoneClass: ZoneClass,
  direction: 'LONG' | 'SHORT',
  sourceFormationMs: number,
  targetSpot: number,
  opts?: PairNativeZoneOptions,
  shapeDay?: ShapeDayZone,
): ZoneModel | LqzZoneMatrix | null {
  const wantType = direction === 'SHORT' ? 'SUPPLY' : 'DEMAND';
  const wantSide = direction === 'SHORT' ? 'SELL_SIDE' : 'BUY_SIDE';
  // Phase 5 (2026-07-31, E2): the on-side/proximity reference is the SHAPE
  // DAY's own open — the E2 waveform's day-native level — NOT the
  // week-anchor Friday spot ("make it E2 waveform based not dumb fucking
  // friday spot price based"). No shape day → the model spot (byte-identical
  // to the v4.5.x semantics).
  const daySpot = shapeDay?.dayOpenSpot ?? targetSpot;
  // Spot-side predicate: supply above spot for SHORT, demand below for LONG.
  const onSide = (center: number): boolean =>
    direction === 'SHORT' ? center >= daySpot : center <= daySpot;
  const excluded = opts?.excludedIds;
  const week = opts?.week;
  /** A battle inside the model's week — the recently-battled proof. */
  const battledWithinWeek = (z: ZoneModel): boolean =>
    week !== undefined &&
    z.reactionEvents.some((ev) => ev.lastTouchMs >= week.weekStartMs && ev.lastTouchMs <= week.anchorMs);

  // v4.5.2: price-range filter — exclude zones from completely different price
  // regimes. Uses the LMV table's coverage (the current market's actual range)
  // as the reference, NOT spot price. Zones outside [minCenter-buffer, maxCenter+buffer]
  // are stale (from weeks/months ago at different price levels).
  const lmvCenters = targetLmv.map(z => z.center).sort((a, b) => a - b);
  const minCenter = lmvCenters.length > 0 ? lmvCenters[0]! : -Infinity;
  const maxCenter = lmvCenters.length > 0 ? lmvCenters[lmvCenters.length - 1]! : Infinity;
  const rangeBuffer = (maxCenter - minCenter) * 0.15; // 15% beyond the LMV range
  const inPriceRange = (center: number): boolean =>
    center >= minCenter - rangeBuffer && center <= maxCenter + rangeBuffer;

  const candidates: PairNativeCandidate[] = [];
  // ── THE E2-AUTHORITATIVE EXACT MATCH (the 2026-08-01 overhaul): the E2
  //    CORE's keyZoneId designation is checked against the FULL model —
  //    every OB zone and every LMV rung — BEFORE any class/group/price
  //    filtering. The operator: "E2 DESIGNATES the zone, E3 OBEYS — an
  //    exact keyZoneId match returns IMMEDIATELY, no ranking, no
  //    heuristics." The OLD code checked only the class-locked pool (a DXY
  //    LQZ source → LQZ-only pool → the E2-designated 1H OB zone never
  //    entered → the strength-ranked June rung won). The E2 designation
  //    overrides the class lock, the freshness gates, and the price range.
  // 2026-08-05 (the decisive fix): the E2-authoritative exact-match uses the
  // DIRECTION-APPROPRIATE designation — the LONG mirror obeys the demandZoneId
  // (the demand designation!), the SHORT the supplyZoneId — the operator's
  // inverse cascade: DXY supply → EU demand (the LONG mirrors MUST anchor the
  // DEMAND — the old keyZoneId (the day's PRIMARY — the SHORT's supply!)
  // anchored the LONG mirrors at the SUPPLY — the wrong side — the operator:
  // "supply --> demand and demand --> supply dxy supply --> eu demand and
  // vice versa"). The keyZoneId remains the fallback (the RANGE days / the
  // single-designation days).
  const e2MatchId = shapeDay ? (direction === 'LONG' ? shapeDay.demandZoneId : shapeDay.supplyZoneId) ?? shapeDay.keyZoneId : undefined;
  if (e2MatchId) {
    // ZR-4.1: the distribution check — the E2 designation holds for the
    // FIRST source; a subsequent same-direction same-day source whose
    // E2-designated zone is ALREADY used distributes to the next-distinct
    // zone (the N-distinct-signals-N-distinct-zones principle — the
    // distribution is a property of the SIGNALS, never the outcomes).
    // The LMV rungs register pair-prefixed (`lmvAnchorId(targetPair, ...)`)
    // in the used sets while the exact-match checks the 'LMV'-prefixed
    // form — the exclusion honors BOTH the exact id AND the centerKey
    // suffix (`|<center.toFixed(5)>`), the :1482 pattern.
    const lmvExcluded = (z: LqzZoneMatrix): boolean => {
      if (!excluded) return false;
      if (excluded.has(lmvAnchorId('LMV', z))) return true;
      const ck = `|${z.center.toFixed(5)}`;
      for (const eid of excluded) if (eid.endsWith(ck)) return true;
      return false;
    };
    for (const z of targetObZones) {
      if (z.id === e2MatchId) {
        if (!(excluded?.has(z.id))) return z; // AUTHORITATIVE — the first source
        // else: fall through to the strength-ranked pool (which respects the exclusion)
      }
    }
    for (const z of targetLmv) {
      if (lmvAnchorId('LMV', z) === e2MatchId) {
        if (!lmvExcluded(z)) return z; // AUTHORITATIVE — the first source
      }
    }
    // B1 (2026-08-01) — the pair-prefixed LMV designation fix: the E2 CORE's
    // LMV rung designation is `LMV|<pair>|<center>` (the bridged-zone id
    // format, matrixZonesToZoneModels / shape-brain's pick.id); the mirror's
    // own lmvAnchorId('LMV', z) is `LMV|LMV|<center>` — the 'LMV' pair
    // argument fills the pair slot, so a pair-prefixed designation NEVER
    // string-equals it (the EU Tue mirror emitted 1.14728 instead of the E2's
    // `LMV|EUR/USD|1.14650`). Normalize both sides to the NUMERIC TAIL (the
    // center) before comparing — an LMV rung IS its center (the id encodes
    // it), so a center-tail match IS the E2-designated rung. Handles the bare
    // form (`LMV|1.14650`) and the pair-prefixed form (`LMV|EUR/USD|1.14650`)
    // identically.
    const e2CenterTail = (e2MatchId ?? '').split('|').pop() ?? '';
    for (const z of targetLmv) {
      if (lmvAnchorId('LMV', z).split('|').pop() === e2CenterTail) {
        if (!lmvExcluded(z)) return z; // AUTHORITATIVE — the first source (center match)
      }
    }
    // The center-suffix fallback (the pair-prefixed id format): the centerKey
    // derives from the DESIGNATION's OWN numeric tail — the resolved zone's
    // center (`LMV|EUR/USD|1.14650` → `|1.14650`), the zone geometry.
    // ZR-6A/B (2026-08-04): the E2 price (keyZonePrice) is GONE from the E2
    // output — "E2 generates SHAPE CHAIN from ZONE ANCHORS (prices are not
    // even a variable for E2)" — the key NEVER reads it.
    const centerKey = `|${e2CenterTail}`;
    for (const z of targetObZones) {
      if (z.id.endsWith(centerKey) && !(excluded?.has(z.id))) return z;
    }
    for (const z of targetLmv) {
      if (lmvAnchorId('LMV', z).endsWith(centerKey) && !lmvExcluded(z)) return z;
    }
  }
  if (zoneClass === 'LQZ') {
    for (const z of targetLmv) {
      if (z.side !== wantSide || !onSide(z.center)) continue;
      const id = lmvAnchorId('LMV', z);
      // v4.5.2 FIX: also check pair-prefixed format (reAnchorMirror stores
      // lmvAnchorId(targetPair, anchor) which has a DIFFERENT prefix).
      // Without this, the distribution exclusion NEVER fires → all mirrors
      // pile on the same strongest zone.
      const centerKey = `|${z.center.toFixed(5)}`;
      if (excluded?.has(id) || (excluded && [...excluded].some(eid => eid.endsWith(centerKey)))) continue;
      candidates.push({
        kind: 'LQZ', ob: null, lqz: z,
        id,
        center: z.center,
        formationMs: z.candles.length > 0 ? z.candles[0]!.timestamp : 0,
        tier: lqzSignificanceTier(z),
        group: 0, // LMV rows carry no freshness recurrence — always admissible
      });
    }
  } else {
    for (const z of targetObZones) {
      if (z.classification !== zoneClass || z.type !== wantType) continue;
      // Wave A1.1 (2026-08-01) — DECISION-1: the IP zones (source==='PILLAR',
      // merged into the ONE zone map by the E1 reintegration) are confluence/
      // ZFP/context + SL/TP rungs, NEVER entries. The §8.1 anchor search skips
      // them ADDITIVELY (no pre-existing zone carries the tag → byte-identical
      // behavior for the S/D/L lane). Absent this guard, an IP zone could win
      // the class pool or the center-key fallback and become an entry anchor.
      if ((z as { source?: string }).source === 'PILLAR') continue;
      // v4.5.2: VIOLATED zones admitted ONLY within a tight price band of
      // the day-native spot. The golden-level zones are VIOLATED (consumed
      // by the week) but they're the levels the operator trades at. Without
      // admitting them, the cascade picks non-VIOLATED zones at wrong levels.
      // The 50-pip band prevents garbage VIOLATED zones from other regimes.
      // Phase 5 (E2): the band centers on the SHAPE DAY's open (daySpot),
      // not the Friday spot — the E2 waveform's day-native regime.
      if (z.freshness === 'VIOLATED') {
        const pipSize = targetSpot > 50 ? 0.01 : 0.0001; // pair identity (DXY 0.01 / FX 0.0001)
        if (Math.abs(mid(z) - daySpot) > 50 * pipSize) continue;
      }
      if (excluded?.has(z.id)) continue;
      const center = mid(z);
      if (!inPriceRange(center)) continue;
      const group = z.freshness !== 'DEPLETED' && z.freshness !== 'VIOLATED' ? 0 : z.freshness === 'DEPLETED' ? (battledWithinWeek(z) ? -1 : -2) : -2; // VIOLATED within band = group -2 (same as non-battled DEPLETED)
      candidates.push({
        kind: 'ORDER_BLOCK', ob: z, lqz: null,
        id: z.id, center,
        formationMs: z.formationMs,
        tier: obSignificanceTier(z),
        group,
      });
    }
    // v4.5.5 RE-PORT — THE §8.1 UNION POOL (PRISTINE :1313-1342, VERBATIM
    // semantics): when the class-locked OB pool collapses, the LMV rungs
    // join the OB-class candidacy at group −1.5 (between the OB
    // recently-battled tier and the OB rank/nearest tier). The RECENCY
    // GATE (unchanged): a rung without a reaction candle inside the
    // model's week is not this week's anchor. ADAPTATION (current
    // structure): the exclusion check mirrors the current LQZ branch's
    // pair-prefix fix (reAnchorMirror stores lmvAnchorId(targetPair, z) —
    // a DIFFERENT prefix from 'LMV' — so the distribution exclusion must
    // match by center-suffix too, else it never fires).
    if (opts?.classFlexibleLQZFallback) {
      for (const z of targetLmv) {
        if (z.side !== wantSide || !onSide(z.center)) continue;
        const id = lmvAnchorId('LMV', z);
        const centerKey = `|${z.center.toFixed(5)}`;
        if (excluded?.has(id) || (excluded && [...excluded].some(eid => eid.endsWith(centerKey)))) continue;
        if (week !== undefined) {
          const lastReaction = z.candles.length > 0 ? z.candles[z.candles.length - 1]!.timestamp : 0;
          if (lastReaction < week.weekStartMs || lastReaction > week.anchorMs) continue; // stale rung — not this week's anchor
        }
        candidates.push({
          kind: 'LQZ', ob: null, lqz: z,
          id,
          center: z.center,
          formationMs: z.candles.length > 0 ? z.candles[0]!.timestamp : 0,
          tier: lqzSignificanceTier(z),
          group: -1.5,
        });
      }
    }
  }
  if (candidates.length === 0) return null;

  // The best admissibility group ONLY (an alive zone always outranks a
  // consumed one); WITHIN it the v4.5.0 §5.3 semantics run unchanged.
  let bestGroup = -Infinity;
  for (const c of candidates) if (c.group > bestGroup) bestGroup = c.group;
  const best = candidates.filter((c) => c.group === bestGroup);

  // v4.5.2: REACTION-time ±48h pool preference. Uses the zone's LATEST
  // reaction (not formation time). Zones that reacted near the DXY signal
  // time are the structural equivalents — created by the same market event.
  // Formation time (zone creation) can be weeks old; reaction time is when
  // price actually tested the zone during the signal week.
  const reactionMsOf = (c: PairNativeCandidate): number => {
    if (c.kind === 'LQZ' && c.lqz!.candles.length > 0) {
      return c.lqz!.candles[c.lqz!.candles.length - 1]!.timestamp;
    }
    if (c.kind === 'ORDER_BLOCK' && c.ob!.reactionEvents.length > 0) {
      return c.ob!.reactionEvents[c.ob!.reactionEvents.length - 1]!.lastTouchMs;
    }
    return c.formationMs;
  };
  const timed = Number.isFinite(sourceFormationMs)
    ? best.filter((c) => Math.abs(reactionMsOf(c) - sourceFormationMs) <= 2 * FORMATION_TIME_TOLERANCE_MS)
    : [];
  const pool = timed.length > 0 ? timed : best;

  // ── E2 (Phase 5, operator 2026-07-31): E2 DESIGNATES the zone, E3 OBEYS.
  //    An exact keyZoneId match returns IMMEDIATELY — no ranking, no
  //    heuristics. This REPLACES the advisory +2 tier bonus (the failure:
  //    the cascade picked the STRONGEST zone, not the GOLDEN-LEVEL zone).
  //    The search set is the FULL class+side candidate pool (`candidates`,
  //    not the narrowed `pool`): the E2 designation is authoritative — the
  //    reaction-time/group preference must not hide the golden zone.
  //    Friday spot is OUT of this path — the day-native reference
  //    (shapeDay.dayOpenSpot) governs on-side and the VIOLATED band above. ──
  if (shapeDay?.keyZoneId) {
    // The exclusion-aware E2 match (the distribution): the exact id + the
    // center-suffix must NOT re-admit a zone already registered in the
    // used-anchor set — the N-distinct-signals-N-distinct-zones principle.
    // ZR-6A made the centerKey LIVE (the E2 price is gone); without the
    // exclusion check here, the pool-based match re-admits the excluded
    // zone and defeats the distribution (the C1 pile-up, 2026-08-04).
    const cExcluded = (c: { id: string; center: number }): boolean => {
      if (!excluded) return false;
      if (excluded.has(c.id)) return true;
      const ck = `|${c.center.toFixed(5)}`;
      for (const eid of excluded) if (eid.endsWith(ck)) return true;
      return false;
    };
    const exact = candidates.find((c) => c.id === shapeDay.keyZoneId);
    if (exact && !cExcluded(exact)) return exact.kind === 'LQZ' ? exact.lqz! : exact.ob!;  // AUTHORITATIVE
    // center-suffix fallback (the lmvAnchorId format, mirror.ts:1271-1276):
    // ZR-6A/B — the key derives from the designation's OWN numeric tail (the
    // resolved zone's center — the zone geometry); the E2 price
    // (keyZonePrice) is GONE from the E2 output, never read.
    const centerKey = `|${shapeDay.keyZoneId.split('|').pop() ?? ''}`;
    const centerMatch = candidates.find((c) => c.id.endsWith(centerKey) && !cExcluded(c));
    if (centerMatch) return centerMatch.kind === 'LQZ' ? centerMatch.lqz! : centerMatch.ob!;
  }
  // direction-aware: the MIRROR's direction selects the side — a SHORT mirror consumes
  // the day's designated SUPPLY even when the chain day says LONG (the golden Mon has
  // BOTH a SHORT 1.14544 and a LONG 1.14004; the cascade chain designates ONE side per
  // day). The ShapeDayZone carries both supplyZoneId and demandZoneId — try the
  // mirror's side FIRST, then the chain day's own side (the keyZoneId path above).
  const mirrorDir = direction;   // the setup's actual direction (not the chain day's)
  if (mirrorDir === 'SHORT') {
    if (shapeDay?.supplyZoneId) {
      const s = candidates.find((c) => c.id === shapeDay.supplyZoneId);
      if (s) return s.kind === 'LQZ' ? s.lqz! : s.ob!;
    }
    // the chain day's designation may be a demand (LONG day) — fall through to ranking
  } else if (mirrorDir === 'LONG') {
    if (shapeDay?.demandZoneId) {
      const d = candidates.find((c) => c.id === shapeDay.demandZoneId);
      if (d) return d.kind === 'LQZ' ? d.lqz! : d.ob!;
    }
  } else if (shapeDay?.direction === 'SHORT' && shapeDay.supplyZoneId) {
    const s = candidates.find((c) => c.id === shapeDay.supplyZoneId);
    if (s) return s.kind === 'LQZ' ? s.lqz! : s.ob!;
  } else if (shapeDay?.direction === 'LONG' && shapeDay.demandZoneId) {
    const d = candidates.find((c) => c.id === shapeDay.demandZoneId);
    if (d) return d.kind === 'LQZ' ? d.lqz! : d.ob!;
  }

  // The fallback after the authoritative checks — the EXISTING
  // class+side+strength ranking (the +2 tier bonus is GONE; the advisory
  // proximity path is removed). When shapeDay is absent this is
  // byte-identical to the pre-E2 semantics: the old bonus was 0 without
  // the E2 price, so the old sort ≡ this plain tier sort.
  const ranked = [...pool].sort((a, b) =>
    (b.tier - a.tier) ||
    (Math.abs(a.center - targetSpot) - Math.abs(b.center - targetSpot)) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const top = ranked[0]!;
  return top.kind === 'LQZ' ? top.lqz! : top.ob!;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §5.2 — the re-anchored geometry (defended-edge entry, reaction-extreme SL,
// Law-14 TP over the LmvTable)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The defended-edge entry (§5.2: "entry = defendedEdge(anchorZone,
 * direction)"). An LMV anchor yields its own defendedEdge directly. An OB
 * anchor borrows the defendedEdge of its strongest OVERLAPPING LMV zone on
 * the trade's side (most reaction candles = the most-proven turn level;
 * tiebreak: lowest zfp, then nearest the zone's directional defense edge —
 * bottom for LONG, top for SHORT). No overlap → the v4.4 canon front edge
 * (LONG: zone ceiling, SHORT: zone floor — gen:1082-1091), documented
 * fallback (the LMV table is the primary E anchor; the geometric edge is
 * the honest degenerate).
 *
 * v4.5.x R2 BAND FIDELITY: the borrowed defendedEdge must belong to the
 * ANCHOR'S band — when the strongest overlap's defendedEdge lies OUTSIDE
 * [anchor.bottom, anchor.top] the level belongs to a DIFFERENT structure
 * (measured: the consumed GU 1.34337 supply's overlap — the 1.34347 LMV
 * zone — defends 1.34280, BELOW the supply band; entering a SHORT under
 * the zone's floor is not the anchor's trade). The canon front edge is
 * the honest anchor-native level in that case (the same fallback as the
 * no-overlap degenerate).
 */
function defendedEdgeEntry(
  anchor: ZoneModel | LqzZoneMatrix,
  direction: 'LONG' | 'SHORT',
  lmv: LmvTable,
): { entry: number; overlap: LqzZoneMatrix | null } {
  // §5.4 (v4.5.2) + WAVE H1 RE-PORT (PRISTINE :1399): the canon entry
  // anchor — entryPrice_LMV (sl-lmv.ts) — for an LMV zone IS its
  // defendedEdge (value-identical to the pre-E2_CASCADE read; the canon
  // function is the mandated path — the E2_CASCADE wipe inlined
  // `anchor.defendedEdge` and LOST the call).
  if (isLqzAnchor(anchor)) return { entry: entryPrice_LMV(anchor, direction), overlap: anchor };
  const wantSide = direction === 'LONG' ? 'BUY_SIDE' : 'SELL_SIDE';
  const defenseEdge = direction === 'LONG' ? anchor.bottom : anchor.top;
  const overlapping = lmv
    .filter((z) => z.side === wantSide && z.bottom <= anchor.top && z.top >= anchor.bottom)
    .sort((a, b) =>
      (b.candles.length - a.candles.length) ||
      (a.zfp - b.zfp) ||
      (Math.abs(a.center - defenseEdge) - Math.abs(b.center - defenseEdge)) ||
      (a.center - b.center));
  const frontEdge = direction === 'LONG' ? anchor.top : anchor.bottom;
  if (overlapping.length > 0) {
    const best = overlapping[0]!;
    // Band fidelity: the borrowed level must sit inside the anchor's band.
    if (best.defendedEdge >= anchor.bottom - 1e-9 && best.defendedEdge <= anchor.top + 1e-9) {
      return { entry: best.defendedEdge, overlap: best };
    }
    // v4.5.5 FIX 3 — THE ENTRY-PRECISION FALLBACK (PRISTINE :1416-1428, the
    // E2_CASCADE wipe LOST it): when the borrowed defendedEdge belongs to a
    // DIFFERENT structure (the consumed GU 1.34337 supply: the overlap
    // defends 1.34280, below the band), resolve the entry to the overlap
    // rung's defended-side edge — SHORT → the rung's top, LONG → the rung's
    // bottom: the operator's entries sit at the shelf's far edge
    // (near-edge + 2-3 pips inside the zone), never at the raw geometric
    // band edge. The current tree fell to the raw frontEdge (pre-FIX-3).
    return { entry: direction === 'SHORT' ? best.top : best.bottom, overlap: best };
  }
  return { entry: frontEdge, overlap: overlapping[0] ?? null };
}

/**
 * The volatility-aware SL (§5.4): the reaction-extreme SL on the TARGET's
 * OWN LmvTable — `sl = nextRungBelow.reactionExtreme − buffer` (LONG) /
 * `nextRungAbove.reactionExtreme + buffer` (SHORT), buffer = the Law-7 pair
 * buffer. The candidate walk is ordered: (1) the anchor's OWN LMV extreme
 * (the anchor itself, or its entry-overlap zone — §3.2's sweep-catch
 * doctrine: the entry zone's deepest defended point IS the structural
 * invalidation), (2) the rungs strictly beyond the anchor band, nearest
 * first. The reactionExtreme is the deepest price the rung's candles
 * probed and were REJECTED at — the SL clears the target's wick range by
 * construction. Law-10 floor (≥ 0.5×ATR from entry) + D17 36-pip ceiling
 * (the canon rung walk) preserved; no candidate → null (honest SL_INVALID).
 *
 * v4.5.x REFINEMENT 2 (volatilityClear): for a CONSUMED anchor (the
 * recently-battled / rank-nearest fallback), the accepted SL must ALSO
 * clear the pair's wick range: it must not rest INSIDE any adverse-side
 * LMV zone band whose reactionExtreme extends beyond it (a stop parked
 * inside a zone's defended band is hunted by that zone's own wick). A
 * candidate failing the check is walked past; none → null (honest
 * SL_INVALID — the GU lane's volatility guard, never a fabricated stop).
 */
function computeReactionExtremeSL(
  entry: number,
  anchor: ZoneModel | LqzZoneMatrix,
  overlap: LqzZoneMatrix | null,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
  targetPair: string,
  pipValue: number,
  volatilityClear = false,
): { sl: number; method: string; rungId: string; rxExt: number } | null {
  const bufferPips = LAW7_SL_BUFFER_PIPS[targetPair] ?? 3;
  const buffer = bufferPips * pipValue;
  const atr1hPips = proxyAtr1hPips(targetModel, pipValue);
  const bandBottom = anchor.bottom;
  const bandTop = anchor.top;

  interface SlCandidate { rxExt: number; id: string }
  const candidates: SlCandidate[] = [];
  // (1) the anchor's own LMV extreme first.
  if (isLqzAnchor(anchor)) {
    candidates.push({ rxExt: anchor.reactionExtreme, id: lmvAnchorId(targetPair, anchor) });
  } else if (overlap) {
    candidates.push({ rxExt: overlap.reactionExtreme, id: lmvAnchorId(targetPair, overlap) });
  }
  // (2) the rungs strictly beyond the anchor band, nearest first.
  const beyond = targetModel.lmv.table
    .filter((z) => direction === 'LONG' ? z.top < bandBottom - 1e-9 : z.bottom > bandTop + 1e-9)
    .sort((a, b) =>
      (direction === 'LONG' ? b.top - a.top : a.bottom - b.bottom) ||
      (a.center - b.center));
  for (const z of beyond) candidates.push({ rxExt: z.reactionExtreme, id: lmvAnchorId(targetPair, z) });

  for (const c of candidates) {
    let sl = direction === 'LONG' ? c.rxExt - buffer : c.rxExt + buffer;
    let method = 'lmv-reaction-extreme';
    // Sanity: the SL must sit on the ADVERSE side of entry.
    if (direction === 'LONG' && sl >= entry) continue;
    if (direction === 'SHORT' && sl <= entry) continue;
    // Law-10 floor (skipped when ATR unknown — canon).
    if (atr1hPips > 0) {
      const minDistPips = Math.max(LAW10_ATR_FRACTION * atr1hPips, bufferPips);
      if (Math.abs(entry - sl) / pipValue < minDistPips) {
        sl = direction === 'LONG' ? entry - minDistPips * pipValue : entry + minDistPips * pipValue;
        method += '+law10-floor';
      }
    }
    // D17 ceiling — HARD; walk to the next candidate.
    if (Math.abs(entry - sl) / pipValue > D17_SL_CEILING_PIPS) continue;
    // v4.5.x R2 volatility check (consumed anchors): the SL must clear the
    // pair's wick range — never parked INSIDE an adverse-side zone band
    // whose own wick (reactionExtreme) extends beyond it.
    if (volatilityClear) {
      const hunted = targetModel.lmv.table.some((z) =>
        sl > z.bottom + 1e-9 && sl < z.top - 1e-9 &&
        (direction === 'SHORT' ? z.reactionExtreme >= sl - 1e-9 : z.reactionExtreme <= sl + 1e-9));
      if (hunted) continue;
      method += '+vol-clear';
    }
    return { sl, method, rungId: c.id, rxExt: c.rxExt };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// v4.5.5 RE-PORT — THE GOLDEN SL PIPELINE (weekProbeAtAnchor + computeGoldenSL_V452)
// (re-ported VERBATIM from Checkpoints/_ARCHIVED/v4.5.5_PRISTINE_CORE/src/mdve/mirror.ts
//  :2304-2536 — the E2_CASCADE wipe dropped these; BUILD_STATE.md:127's claim that
//  they exist was FALSE, grep-verified. Import added: computeSL_LMV + GOLDEN_SL_MAX_PIPS
//  from ./sl-lmv.js (both exported, sl-lmv.ts:84/177).)
// ═══════════════════════════════════════════════════════════════════════════════

/** The week's adverse anatomy at the anchor (the util guard's MAE evidence). */
interface WeekProbe {
  price: number;
  source: string;
}

/**
 * weekProbeAtAnchor — the deepest ADVERSE probe at the anchor within the
 * model's week (the prospective MAE evidence):
 *   OB anchors: the week's NON-PIERCED reaction-event prices beyond the
 *     entry (canon setup-gen:444-445 — the battle probe EXCLUDES pierced
 *     events). For CONSUMED anchors ONLY (includeBandEdge), the zone's own
 *     band edge (SHORT → top, LONG → bottom) joins the evidence: §4.4.3
 *     mandates the re-anchored SL clear a CONSUMED anchor's wick range
 *     (the zone's formation wick is in-model anatomy). For ALIVE anchors
 *     the band edge is NOT wick evidence — a wide alive zone's far edge
 *     would force SLs far outside the golden range (the EU LONG 1.14082
 *     case: a 20.7p-wide BoM demand zone), contradicting §5.3; the golden
 *     doctrine anchors the SL to the defended rung's reactionExtreme.
 *   LQZ anchors: the week's candle highs/lows beyond the entry (the
 *     matrix's own rows; the rung's reactionExtreme is already the
 *     computeSL_LMV candidate basis).
 * null → no adverse week anatomy (the SL room was never probed → util 0).
 */
function weekProbeAtAnchor(
  anchor: ZoneModel | LqzZoneMatrix,
  direction: 'LONG' | 'SHORT',
  entry: number,
  week: { weekStartMs: number; anchorMs: number },
  includeBandEdge: boolean,
  lmvTable?: LqzZoneMatrix[],
): WeekProbe | null {
  let best: WeekProbe | null = null;
  const consider = (price: number, source: string): void => {
    const adverse = direction === 'SHORT' ? price > entry + 1e-9 : price < entry - 1e-9;
    if (!adverse) return;
    if (!best || (direction === 'SHORT' ? price > best.price : price < best.price)) {
      best = { price, source };
    }
  };
  if (isLqzAnchor(anchor)) {
    for (const c of anchor.candles) {
      if (c.timestamp < week.weekStartMs || c.timestamp > week.anchorMs) continue;
      consider(direction === 'SHORT' ? c.high : c.low, `LMV week candle ${dayKeyOfMs(c.timestamp)}`);
    }
  } else {
    for (const ev of anchor.reactionEvents) {
      if (ev.pierced) continue; // canon — pierced events are not the battle probe
      if (ev.firstTouchMs < week.weekStartMs || ev.firstTouchMs > week.anchorMs) continue;
      consider(ev.price, `${ev.anatomy} @ ${ev.price} (week battle)`);
    }
    // GA-audit fix: the reaction-event set EXCLUDES pierced events (canon),
    // which blinds the probe to touches AT/exactly the zone edge (the EU
    // supply 1.14469-1.14608: Friday's 1.14608 high == the zone top,
    // excluded as pierced → a 2.7p SL parked inside the anatomy and stopped
    // same-bar). The week's LMV candle wicks reaching INTO the anchor band
    // ARE the adverse anatomy — the same in-model candle substrate the LQZ
    // branch scans, deterministic.
    if (lmvTable) {
      for (const z of lmvTable) {
        if (z.bottom > anchor.top + 1e-9 || z.top < anchor.bottom - 1e-9) continue; // no band overlap
        for (const c of z.candles) {
          if (c.timestamp < week.weekStartMs || c.timestamp > week.anchorMs) continue;
          const wick = direction === 'SHORT' ? c.high : c.low;
          const reachesBand = direction === 'SHORT' ? wick >= anchor.bottom - 1e-9 : wick <= anchor.top + 1e-9;
          if (reachesBand) consider(wick, `LMV week candle touch of the anchor band ${dayKeyOfMs(c.timestamp)}`);
        }
      }
    }
    if (includeBandEdge) {
      consider(
        direction === 'SHORT' ? anchor.top : anchor.bottom,
        'anchor band edge (§4.4.3 — a consumed anchor\'s SL must clear the wick range)',
      );
    }
  }
  return best;
}

export interface SlV452Result {
  sl: number;
  method: string;
  rungId: string;
  rxExt: number | null;
  /** The explicit justifications (UTIL_GUARD_KEEP / PROBE_GUARD) — logged, never silent. */
  flags: string[];
}

/**
 * computeGoldenSL_V452 — the v4.5.2 §5.3 SL pipeline for EU/GU mirrors:
 *   1. GOLDEN — computeSL_LMV (sl-lmv.ts: the reaction-extreme SL accepted
 *      inside [Law-10 floor, GOLDEN_SL_MAX 9.5p]; the entry zone's OWN
 *      deepest probe is the first candidate — the selective guard is
 *      preserved by construction, setup-gen:476-496).
 *   2. PROBE GUARD (canon setup-gen:498-523) + §4.4.3 WICK-CLEAR — when
 *      the golden SL lands INSIDE the anchor's own adverse anatomy (the
 *      week's battle probe or the zone's band edge), the SL lifts just
 *      beyond it (Law-7 buffer): a stop parked inside the anatomy is
 *      hunted by the wick that printed it.
 *   3. THE SELECTIVE UTIL GUARD (§5.3, audit FIX 2) — when the result
 *      still exceeds the golden range (9.5p + pair buffer):
 *      util = probeDepth / structuralSlDist (the week's adverse anatomy
 *      as a fraction of the v4.5.x structural SL room). util ≥ 0.40 →
 *      the width was USED → KEEP the structural reaction-extreme SL with
 *      the logged UTIL_GUARD_KEEP justification (e.g. the GU 1.34337:
 *      Friday's 18p probe of the 23p room → util 0.78 → the vol-cleared
 *      1.34567 stands, Appendix C verbatim). util < 0.40 → the lifted
 *      golden SL stands with the logged PROBE_GUARD justification.
 *   4. No LMV substrate (no entry zone) → the v4.5.x structural SL
 *      stands (honest degradation, §12 Law 3).
 * Every SL beyond the golden range carries an explicit logged
 * justification — NO silent 16-33 pip SLs (the audit's EU defect).
 */
function computeGoldenSL_V452(
  entry: number,
  anchor: ZoneModel | LqzZoneMatrix,
  overlap: LqzZoneMatrix | null,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
  targetPair: string,
  pipValue: number,
  structural: { sl: number; method: string; rungId: string; rxExt: number },
): SlV452Result {
  const bufferPips = LAW7_SL_BUFFER_PIPS[targetPair] ?? 3;
  const buffer = bufferPips * pipValue;
  const entryLmvZone = isLqzAnchor(anchor) ? anchor : overlap;
  if (!entryLmvZone) {
    return { ...structural, flags: [] }; // no LMV substrate — the v4.5.x SL stands (honest)
  }

  const golden = computeSL_LMV(entry, entryLmvZone, direction, targetModel.lmv.table, targetPair, {
    atrPips: proxyAtr1hPips(targetModel, pipValue),
    weekExtreme: direction === 'LONG'
      ? targetModel.lmv.coverage.minPrice
      : targetModel.lmv.coverage.maxPrice,
  });

  let sl = golden.sl;
  let method = `v452-golden-${golden.method}`;
  const flags: string[] = [];

  // The PROBE GUARD (canon setup-gen:498-523) + §4.4.3 wick-clear for
  // CONSUMED anchors: the SL must clear the week's adverse anatomy (the
  // battle probe; for consumed anchors also the zone's band edge).
  const anchorConsumed = !isLqzAnchor(anchor) && anchor.freshness === 'DEPLETED';
  const probe = weekProbeAtAnchor(anchor, direction, entry, targetModel.anchor, anchorConsumed, targetModel.lmv.table);
  const clearsAnatomy = (s: number): boolean =>
    !probe || (direction === 'SHORT' ? s >= probe.price + buffer - 1e-9 : s <= probe.price - buffer + 1e-9);
  if (!clearsAnatomy(sl)) {
    const p = probe!;
    sl = direction === 'SHORT' ? p.price + buffer : p.price - buffer;
    method += `+PROBE_GUARD(${p.source})`;
  }

  // §5.3 GOLDEN FLOOR (the operator's canon: "golden 4-9.5 pips"). The
  // Law-10 floor inside computeSL_LMV (max(0.5×ATR, buffer)) can accept a
  // 2-3p SL — inside the wick noise the golden range exists to escape (the
  // GA audit's EU 1.14572 case: a 2.7p SL stopped in the trigger bar). A
  // sub-floor SL walks to the NEXT defended rung landing inside the golden
  // range AND clearing the week's anatomy; no qualifying rung → the
  // structural SL stands with the logged GOLDEN_FLOOR_FALLBACK (§12 Law 3
  // honest degradation — never a silent razor stop).
  const GOLDEN_SL_MIN_PIPS = 4;
  let floorDistPips = Math.abs(entry - sl) / pipValue;
  if (floorDistPips < GOLDEN_SL_MIN_PIPS - 1e-9) {
    const rungs = targetModel.lmv.table
      .filter((z) => (direction === 'LONG' ? z.reactionExtreme < entry : z.reactionExtreme > entry))
      .sort(
        (a, b) =>
          Math.abs(a.center - entry) - Math.abs(b.center - entry) ||
          a.center - b.center ||
          a.bottom - b.bottom,
      );
    let lifted = false;
    for (const rung of rungs) {
      const candidate = direction === 'LONG' ? rung.reactionExtreme - buffer : rung.reactionExtreme + buffer;
      const d = Math.abs(entry - candidate) / pipValue;
      if (d >= GOLDEN_SL_MIN_PIPS - 1e-9 && d <= GOLDEN_SL_MAX_PIPS + bufferPips + 1e-9 && clearsAnatomy(candidate)) {
        flags.push(
          `GOLDEN_FLOOR: the golden SL (${floorDistPips.toFixed(1)}p) sat below the 4p floor ` +
          `(wick noise — the EU 1.14572 2.7p same-bar-stop case) → lifted to the next defended rung (${d.toFixed(1)}p)`,
        );
        sl = candidate;
        method += '+GOLDEN_FLOOR';
        floorDistPips = d;
        lifted = true;
        break;
      }
    }
    if (!lifted) {
      flags.push(
        `GOLDEN_FLOOR_FALLBACK: no defended rung in [${GOLDEN_SL_MIN_PIPS}p, ${GOLDEN_SL_MAX_PIPS}+${bufferPips}p] ` +
        `clears the week's anatomy → the structural reaction-extreme SL (${(Math.abs(entry - structural.sl) / pipValue).toFixed(1)}p) ` +
        `stands (§12 Law 3 honest degradation — never a silent razor stop)`,
      );
      return {
        sl: structural.sl,
        method: `${structural.method}+GOLDEN_FLOOR_FALLBACK`,
        rungId: structural.rungId,
        rxExt: structural.rxExt,
        flags,
      };
    }
  }

  const distPips = Math.abs(entry - sl) / pipValue;
  const structDistPips = Math.abs(entry - structural.sl) / pipValue;
  if (distPips > GOLDEN_SL_MAX_PIPS + bufferPips + 1e-9 && structDistPips > 0) {
    const probeDepthPips = probe ? Math.abs(probe.price - entry) / pipValue : 0;
    const util = probeDepthPips / structDistPips;
    if (util >= 0.40) {
      flags.push(
        `UTIL_GUARD_KEEP: util=${util.toFixed(2)} ≥ 0.40 (the week's adverse anatomy probed ` +
        `${probeDepthPips.toFixed(1)}p of the ${structDistPips.toFixed(1)}p structural room — the width was USED) ` +
        `→ the structural reaction-extreme SL is KEPT (§5.3 selective guard; tighten ONLY when util < 0.40)`,
      );
      return {
        sl: structural.sl,
        method: `${structural.method}+UTIL_GUARD_KEEP(util=${util.toFixed(2)})`,
        rungId: structural.rungId,
        rxExt: structural.rxExt,
        flags,
      };
    }
    flags.push(
      `PROBE_GUARD: util=${util.toFixed(2)} < 0.40 but the week's anatomy (${probe?.source ?? 'band edge'}) ` +
      `forces the SL to ${distPips.toFixed(1)}p (> golden ${GOLDEN_SL_MAX_PIPS}+${bufferPips}p) — ` +
      `a stop inside the probe is dead on arrival (canon setup-gen PROBE_GUARD; §4.4.3 wick-clear)`,
    );
    method += `(util=${util.toFixed(2)})`;
  }
  return { sl, method, rungId: structural.rungId, rxExt: entryLmvZone.reactionExtreme, flags };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WAVE ZR-3 (2026-08-04) — THE E3 CONDITIONAL ANCHORS (the D37 killers)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ZR-3.2 — THE STRENGTH CLASSIFIER (the operator, verbatim): "the stronger
 * the pressure of the zone, the weaker the mitigation will be prior to the
 * reaction. Strong pressure zones = near instant reaction. exit on the
 * closest zone edge and even potentially add a 1-2 pip spread so you dont
 * miss the exit. Weak pressure zones = delayed reaction. Maximize the
 * profits you catch from these while the candles are still inside of them."
 * STRONG: BoM / FORTRESS / confluence ≥ 8. WEAK: virgin MoM / low
 * confluence (0 < c < 4) / heavily-worked MoM (zfp ≥ 40). Else MIDDLE
 * (the defendedEdge — the pre-ZR-3 behavior, byte-identical).
 */
export function classifyZoneStrength(zone: ZoneModel): 'STRONG' | 'WEAK' | 'MIDDLE' {
  const p = zone.pressure;
  const mitigation = p?.mitigationCount ?? zone.reactionEvents.length;
  if (zone.classification === 'BoM' || p?.lifecycle === 'FORTRESS' || zone.confluence >= 8) return 'STRONG';
  if ((zone.classification === 'MoM' && mitigation === 0) || (zone.confluence > 0 && zone.confluence < 4) || (zone.classification === 'MoM' && zone.zfp >= 40)) return 'WEAK';
  return 'MIDDLE';
}

/**
 * ZR-3.4 — THE E1-PRESSURE WALL CLASSIFICATION (the D37 #1). A wall is
 * STRUCTURAL (it caps the walk) only when it carries real defensive
 * pressure; the shallow LQZ shelves (LMV-bridge, confluence 0,
 * non-fortress) are PASS-THROUGH. The candle-count zfp ladder is the
 * THIRD-order input ("significance is based on E1 first, E2 second, candle
 * mechanics third"), never the wall classification — the canon LQZ ladder
 * floors at zfp 20, so the old predicate fired on EVERY rung and the walk
 * stopped at the nearest shelf (the GU Mon's 1.33720, RRR 1.9).
 */
export function isStructuralWall(zone: ZoneModel): boolean {
  const p = zone.pressure;
  const lifecycle = p?.lifecycle;
  const defensive = lifecycle === undefined || ['VIRGIN', 'ACTIVE_1', 'ACTIVE_2', 'FORTRESS'].includes(lifecycle);
  if (!defensive) return false;                       // DEPLETED/BROKEN — pass-through
  if (zone.id.startsWith('LMV|')) {
    // an LQZ shelf caps ONLY with real pressure (a fortress or real confluence)
    return lifecycle === 'FORTRESS' || zone.confluence >= 4;
  }
  return true;                                        // S/D structure — the wall
}

/** The LMV rung's bridged ZoneModel (index.ts matrixZonesToZoneModels id
 *  namespace `LMV|${pair}|${center.toFixed(5)}`). Null when the model was
 *  built without the bridge (honest absence). */
function bridgedLmvZone(targetModel: ChartModel, targetPair: string, rung: LqzZoneMatrix): ZoneModel | null {
  const id = `LMV|${targetPair}|${rung.center.toFixed(5)}`;
  return targetModel.zones.find((z) => z.id === id) ?? null;
}

/**
 * ZR-3.2 — the strength-driven TP edge for an LMV rung target. MIDDLE →
 * the rung's defendedEdge (the pre-ZR-3 behavior — byte-identical for the
 * LMV-rung targets: bridged rungs are MoM/confluence-0 → MIDDLE unless
 * heavily worked). STRONG → the close edge + the 1-2 pip spread (don't
 * miss the exit). WEAK → the far edge (maximize the catch).
 */
function strengthDrivenRungTp(
  rung: LqzZoneMatrix,
  zone: ZoneModel | null,
  direction: 'LONG' | 'SHORT',
  pipValue: number,
): number {
  const strength = zone ? classifyZoneStrength(zone) : 'MIDDLE';
  if (strength === 'STRONG') return direction === 'LONG' ? rung.bottom - 1.5 * pipValue : rung.top + 1.5 * pipValue;
  if (strength === 'WEAK') return direction === 'LONG' ? rung.top : rung.bottom;
  return rung.defendedEdge;
}

/**
 * ZR-3.2 — the strength-driven TP edge for an S/D zone target. MIDDLE →
 * the defended edge (the approach edge: LONG → the supply's bottom,
 * SHORT → the demand's top — the first price that arrives touches, the
 * firstUnmitigatedOpposingZone convention). STRONG → the close edge + the
 * spread. WEAK → the far edge.
 */
function strengthDrivenZoneTp(zone: ZoneModel, direction: 'LONG' | 'SHORT', pipValue: number): number {
  const strength = classifyZoneStrength(zone);
  if (strength === 'STRONG') return direction === 'LONG' ? zone.bottom - 1.5 * pipValue : zone.top + 1.5 * pipValue;
  if (strength === 'WEAK') return direction === 'LONG' ? zone.top : zone.bottom;
  return direction === 'LONG' ? zone.bottom : zone.top;
}

/**
 * ZR-6B (2026-08-04) — THE CONFIDENCE JUDGMENT's mechanical proxy (Rule S3,
 * the operator verbatim: "Lower confidence setups - default to safety.
 * Higher confidence setups - default to RR."). The E1/E2-derived score:
 *   base 0.5
 *   +0.2  the E2 day confidence ≥ 0.65 (the pair brain's strength-based day)
 *   +0.15 the contested zone's lifecycle VIRGIN/ACTIVE_1 (fresh fuel — the
 *         operator's "zones usually fail on the THIRD mitigation"; a
 *         lightly-tested zone is a higher-confidence defense)
 *   +0.15 the contested zone's absorption INTACT (the fuel un-consumed —
 *         the LQZ still shields the zone)
 *   +0.1  the storyline's strength verdict matches the trade direction
 *         (the E2 day direction IS the pair brain's strength-based day
 *         verdict — "E2 DESIGNATES, E3 OBEYS"; a day agreeing with the
 *         trade is a higher-confidence setup)
 *   −0.2  lifecycle DEPLETED / absorption ABSORBED (the fuel consumed —
 *         the zone's defense is degraded; the operator's trade-#4 switch:
 *         "liquidity has been absorbed")
 *   clamp [0,1].
 * Score ≥ 0.6 → the RR-tight SL option (3p outside the back edge);
 * < 0.6 → the safety option (1-2p inside the next rung's close edge when
 * available, else the wider of the two valid placements). The contested
 * zone = the mirror's anchor (the E1 zone the trade contests). Error paths
 * FIRST: absent shapeDay confidence forfeits only the +0.2 bonus (never a
 * throw); a zone without a pressure state contributes only the base + the
 * direction-match bonus (honest — no fabricated confidence).
 */
function mirrorConfidenceScore(
  shapeConf: number | undefined,
  anchor: ZoneModel | LqzZoneMatrix,
  direction: 'LONG' | 'SHORT',
  shapeDay: ShapeDayZone | undefined,
  targetModel: ChartModel,
  targetPair: string,
): number {
  // The contested zone's pressure state: an OB anchor carries its own
  // pressure; an LMV anchor's consumption state lives on the BRIDGED
  // ZoneModel (`LMV|${pair}|${center}` — index.ts matrixZonesToZoneModels)
  // — the rung's lifecycle is 'VIRGIN' by convention (zone-pressure.ts)
  // with the absorption carrying the eaten truth.
  const pressure = isLqzAnchor(anchor)
    ? bridgedLmvZone(targetModel, targetPair, anchor)?.pressure
    : anchor.pressure;
  let c = 0.5;
  if (typeof shapeConf === 'number' && shapeConf >= 0.65) c += 0.2;
  const lifecycle = pressure?.lifecycle;
  if (lifecycle === 'VIRGIN' || lifecycle === 'ACTIVE_1') c += 0.15;
  if (lifecycle === 'DEPLETED') c -= 0.2;
  const absorption = pressure?.absorption;
  if (absorption === 'INTACT') c += 0.15;
  if (absorption === 'ABSORBED') c -= 0.2;
  if (shapeDay && shapeDay.direction === direction) c += 0.1;
  return Math.max(0, Math.min(1, c));
}

/**
 * ZR-3.1 — THE LADDER-STEPS SL (the operator, verbatim): "3 pips outside
 * the back edge of the entry zone, or 1-2 pips inside the close edge of
 * the *next rung* relevant zone... you need to look at the zones like
 * ladder steps. It is either 3 pips outside the far edge of the current
 * step we enter on, or 1-2 pips inside the close edge of the NEXT STEP
 * away (opposite direction of the projected trade direction - if it is a
 * short then this is the next step UP. if it is a long this is the next
 * step DOWN) from the entry step."
 *
 * The RELEVANT zone is the ZR-1 operative defense (computeOperativeDefense
 * — the trade #4 switch: fuel INTACT → the LQZ defends first
 * (SHIELD_FUEL); fuel ABSORBED → the S/D zone itself is the defense
 * (PRESSURE_STRUCTURE)). Null when the entry zone is absent from the
 * model → the caller falls back to the frozen golden SL path. The entry
 * param guards the same-side pathology (a defense whose geometry places
 * the SL on the wrong side of the entry → null, never a fabricated SL).
 */
export function computeLadderStepsSL(
  model: ChartModel,
  entryZoneId: string,
  entry: number,
  direction: 'LONG' | 'SHORT',
  pipValue: number,
  opts?: { asOfMs?: number; confidence?: number },
): { sl: number; defenseId: string; branch: 'CURRENT_STEP' | 'NEXT_STEP'; reason: string } | null {
  const defense = computeOperativeDefense(model, entryZoneId, direction, opts?.asOfMs); // ZR-1
  if (!defense) return null; // → the caller falls back to the frozen golden SL path
  const step = defense.defense;
  const farEdge = direction === 'SHORT' ? step.top : step.bottom;
  const branch1 = direction === 'SHORT' ? farEdge + 3 * pipValue : farEdge - 3 * pipValue;
  const baseReason =
    `operative defense ${defense.defenseKind}: ${step.id} [${step.bottom}-` +
    `${step.top}] (${defense.reason})`;
  const next = defense.nextStep;
  // ── ZR-6B (2026-08-04) — THE CONFIDENCE JUDGMENT (Rule S3, the operator
  //    verbatim: "Lower confidence setups - default to safety. Higher
  //    confidence setups - default to RR."). The safety default (confidence
  //    < 0.6) PREFERS the next-step branch — 1.5p inside the next rung's
  //    close edge (the wider, roomier stop — "the 1-2 pips inside the close
  //    edge of the *next rung* relevant zone") — whenever the next step
  //    exists and the placement is direction-sane; the RR default (≥ 0.6, or
  //    absent — the pre-ZR-6B lane, byte-identical for the diag calls) keeps
  //    the 3p-outside-the-back-edge unless the 3p branch overshoots the next
  //    step (the thin-zone trade-#7 branch — unchanged). "Else the wider of
  //    the two valid placements": a safety-default with NO next step (or an
  //    invalid same-side next placement) falls to the only remaining valid
  //    placement — the 3p-outside-the-back-edge. ──
  const confidence = opts?.confidence;
  const rrDefault = confidence === undefined || confidence >= 0.6;
  if (next) {
    // the next step away (SHORT → the next step UP; LONG → the next step DOWN)
    const nextClose = direction === 'SHORT' ? next.bottom : next.top; // the edge nearest the entry
    const overshoots = direction === 'SHORT' ? branch1 > nextClose : branch1 < nextClose;
    if (!rrDefault || overshoots) {
      // 1-2 pips INSIDE the next step's close edge (the operator's trade #7:
      // "3 pips is not necessary since that zone is only 3 pips wide")
      const sl = direction === 'SHORT' ? nextClose + 1.5 * pipValue : nextClose - 1.5 * pipValue;
      if (direction === 'SHORT' ? sl > entry : sl < entry) {
        return {
          sl, defenseId: next.id, branch: 'NEXT_STEP',
          reason:
            `${baseReason}; ` +
            (rrDefault
              ? `3p-outside-the-far-edge (${branch1}) overshoots the ` +
                `next step ${direction === 'SHORT' ? 'up' : 'down'} ${next.id} ` +
                `[${next.bottom}-${next.top}]'s close edge ${nextClose} → SL 1.5p ` +
                `inside it (${sl}) — the thin-zone branch (trade #7)`
              : `confidence ${confidence!.toFixed(2)} < 0.6 → SAFETY default ` +
                `(Rule S3): SL 1.5p inside the next step ${direction === 'SHORT' ? 'up' : 'down'} ` +
                `${next.id} [${next.bottom}-${next.top}]'s close edge ${nextClose} → ` +
                `${sl} — the wider roomier stop (the 3p-outside ${branch1} is the RR option)`),
        };
      }
      // same-side pathology → fall through to the current-step branch (guarded below)
    }
  }
  if (direction === 'SHORT' ? branch1 <= entry : branch1 >= entry) return null; // same-side — never a fabricated SL
  return {
    sl: branch1, defenseId: step.id, branch: 'CURRENT_STEP',
    reason:
      `${baseReason}; SL = 3p outside the far edge ${farEdge} → ${branch1}` +
      (next
        ? `; next step ${direction === 'SHORT' ? 'up' : 'down'} ${next.id} ` +
          `[${next.bottom}-${next.top}] ${rrDefault ? 'not overshot' : 'no valid safety placement'}`
        : `; no next step ${direction === 'SHORT' ? 'up' : 'down'}`),
  };
}

/**
 * The Law-14 path check's UM cap (Wave H1, FIX PLAN §2.2 STEP 3): the
 * first UNMITIGATED opposing OB zone strictly between entry and the
 * structural TP — a zone whose band price must traverse to reach the TP.
 * An unmitigated zone (reactionEvents.length === 0 — the week's action
 * NEVER touched it) will react FIRST (price cannot teleport) → the TP
 * moves to it. Mitigated zones (the week's action passed through them)
 * are pass-through during BS momentum (the golden T6 proof: 55.5 pips
 * through 5 mitigated zones to the UM 100.680). The reaction level =
 * the zone's approach edge (LONG → the supply's bottom; SHORT → the
 * demand's top — the first price that arrives touches). Total: no zone
 * in the path → null (no cap — the structural TP stands).
 */
function firstUnmitigatedOpposingZone(
  entry: number,
  structuralTp: number,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
): { level: number; zoneId: string } | null {
  const wantType = direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const between = targetModel.zones
    .filter((z) => {
      // The path check judges the REAL S/D zones only — the LMV-derived
      // zones (ids starting 'LMV|') are the same liquidity rungs the TP
      // walk already caps at; treating them here double-caps every walk.
      if (z.id.startsWith('LMV|')) return false;
      if (z.type !== wantType || z.reactionEvents.length > 0) return false;
      const mid = (z.bottom + z.top) / 2;
      return direction === 'LONG'
        ? mid > entry && mid < structuralTp
        : mid < entry && mid > structuralTp;
    })
    .sort((a, b) =>
      (direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (between.length === 0) return null;
  const z = between[0]!;
  return { level: direction === 'LONG' ? z.bottom : z.top, zoneId: z.id };
}

/**
 * The strongest fresh internal LQZ rung of an opposing S/D zone (Wave H1,
 * FIX PLAN §2.2 STEP 2 — "the Earth within the Fire"): the opposing-side
 * LMV rung with zfp ≤ 20 (an unmitigated fresh wall) whose band is INSIDE
 * the zone's band. The pick = lowest zfp, then NEAREST THE ZONE'S OPPOSING
 * EDGE (LONG → the supply's bottom, SHORT → the demand's top — the edge
 * price approaches from; the reaction level), then most reaction candles
 * (the most-proven turn level). Null → the zone carries no fresh internal
 * LQZ (a pure BoM wall without LQZ substrate — the structural equivalence
 * resolution handles it).
 */
function strongestInternalLqzRung(
  zone: ZoneModel,
  direction: 'LONG' | 'SHORT',
  lmv: LmvTable,
): LqzZoneMatrix | null {
  const wantSide = direction === 'LONG' ? 'SELL_SIDE' : 'BUY_SIDE';
  const edge = direction === 'LONG' ? zone.bottom : zone.top;
  const inside = lmv.filter((z) =>
    z.side === wantSide && z.zfp <= 20 &&
    z.bottom >= zone.bottom - 1e-9 && z.top <= zone.top + 1e-9);
  if (inside.length === 0) return null;
  return [...inside].sort((a, b) =>
    (a.zfp - b.zfp) ||
    (Math.abs(a.center - edge) - Math.abs(b.center - edge)) ||
    (b.candles.length - a.candles.length) ||
    (a.center - b.center))[0]!;
}

/**
 * strongestInternalEntryRung — the SAME-side internal LQZ rung of an ENTRY
 * zone (ZR-6A/B, the §8.1 Earth-within-the-Fire union on the trade's own
 * side): the LMV rung (zfp ≤ 20 — a fresh Hard Wall) whose band is FULLY
 * INSIDE the entry zone's band, ranked by the strongestInternalLqzRung
 * mechanism (zfp asc → nearest the zone's approach edge → most reaction
 * candles). For a SHORT entry zone (SUPPLY) the internal rung is SELL_SIDE;
 * for a LONG (DEMAND) BUY_SIDE — the SAME side as the trade (the liquidity
 * the entry anchors to), NEVER the opposing-side rung (that is the TP's
 * rung — the strongestInternalLqzRung's wantSide). Null → the zone carries
 * no fresh internal LQZ on its side (the honest fallback).
 */
function strongestInternalEntryRung(
  zone: ZoneModel,
  direction: 'LONG' | 'SHORT',
  lmv: LmvTable,
): LqzZoneMatrix | null {
  const wantSide = direction === 'LONG' ? 'BUY_SIDE' : 'SELL_SIDE';
  const edge = direction === 'LONG' ? zone.bottom : zone.top;
  const inside = lmv.filter((z) =>
    z.side === wantSide && z.zfp <= 20 &&
    z.bottom >= zone.bottom - 1e-9 && z.top <= zone.top + 1e-9);
  if (inside.length === 0) return null;
  return [...inside].sort((a, b) =>
    (a.zfp - b.zfp) ||
    (Math.abs(a.center - edge) - Math.abs(b.center - edge)) ||
    (b.candles.length - a.candles.length) ||
    (a.center - b.center))[0]!;
}

/**
 * e2ZoneResolvedEntry — the ZR-6A/B E3 PRICE RESOLUTION for an
 * E2-designated anchor: the entry = the resolved anchor zone's internal LQZ
 * rung's NEAR EDGE (the operator's Rule E1 — "LQZ at 1.1444 - 1.14395 ~
 * using this as the entry zone anchor": the entry 1.14395 = the LQZ's near
 * edge from above). SHORT → the rung's floor (the near edge from above);
 * LONG → the rung's ceiling (the near edge from below) — the SAME §8.1
 * internal-rung edge semantics as the DXY source lane's F1-C (setup-gen.ts
 * internalLmvRungEntry: `s.direction === 'LONG' ? rung.top : rung.bottom`).
 * The E2 price (shapeDay.keyZonePrice) is NEVER read — the price is E3's
 * computation from the zone geometry. Error paths FIRST: an LMV anchor IS
 * its own internal rung (the near edge of the anchor rung itself); an OB
 * anchor resolves its strongest same-side internal rung; NO internal rung →
 * the honest defendedEdge fallback (§12 Law 3 — never a fabricated level).
 * The overlap (the entry's LMV zone) rides out for the SL's first candidate
 * (the reaction-extreme path — the entry rung's own deepest probe).
 */
function e2ZoneResolvedEntry(
  anchor: ZoneModel | LqzZoneMatrix,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
  targetPair: string,
  pipValue: number,
  shape?: string,
): { entry: number; overlap: LqzZoneMatrix | null } {
  if (isLqzAnchor(anchor)) {
    // The anchor IS the LQZ rung — the near edge of the rung itself.
    return { entry: direction === 'LONG' ? anchor.top : anchor.bottom, overlap: anchor };
  }
  // THE SHAPE-DRIVEN NEAR/DEEP (2026-08-05 — the operator's per-trade nature):
  // the RECOVERY/REVERSAL trades (the RWL/R/RS/PRWL — the operator's #4
  // "it is plausible that a minor recovery will happen" + the #6 "the deep
  // liquidity that is being fought over") resolve the DEEP internal rung —
  // the #4's E 1.14020 = the LQZ's far edge (the rung 1.14010's ceiling
  // 1.14013 — Δ0.7p — the FX-proven!); the #6's E 1.13935 = the deep LQ
  // shield (the rung 1.13950's ceiling 1.13937 — Δ0.2p!). The SS/BS/WL
  // trades (the #2/#7!) resolve the NEAR (the zone's top — the #7's Δ2.6p
  // HIT!). The SHORT side keeps the internal-rung floor (the measured Δ0.5p
  // HIT — the operator's #1's LQZ below the supply).
  const deepShapes = shape === 'RWL' || shape === 'PRWL' || shape === 'R' || shape === 'RS';
  if (direction === 'LONG') {
    if (deepShapes) {
      const deep = strongestInternalEntryRung(anchor, direction, targetModel.lmv.table);
      if (deep) {
        return { entry: deep.top, overlap: deep };
      }
    }
    // The LONG's entry = the demand zone's TOP (the near edge — the
    // operator's "TP at the demand nested LQZ's near edge" — the entry at
    // the LQZ's top ≈ the zone's top).
    return { entry: anchor.top, overlap: null };
  }
  const rung = strongestInternalEntryRung(anchor, direction, targetModel.lmv.table);
  if (rung) {
    return { entry: rung.bottom, overlap: rung }; // the SHORT-only branch — the LQZ's floor
  }
  return defendedEdgeEntry(anchor, direction, targetModel.lmv.table);
}

/**
 * The structurally-equivalent BoM wall (Wave H1, FIX PLAN §2.2 STEP 1
 * fallback): when the shapeDay's projected opposing zone is a BoM wall
 * WITHOUT a fresh internal LQZ (a bare BoM — the Monday zfp-10 demand
 * [1.13815,1.13886] sits above every rung band; the Earth is absent), the
 * structurally-equivalent opposing BoM wall = the FIRST BoM wall the move
 * encounters on its way to the designation — for a SHORT, the BoM demand
 * with the LOWEST floor ABOVE the designated ceiling (the demand
 * immediately above the designated zone: the Monday move declined to
 * 1.14083, which sits INSIDE the [1.13911,1.14118] BoM demand — the first
 * BoM wall above the [1.13815,1.13886] designation — never reaching the
 * too-deep designation); for a LONG, the BoM supply with the HIGHEST
 * ceiling BELOW the designated floor. The internal LQZ of THAT wall is the
 * reaction level the move will actually trade at. Null → no structurally-
 * equivalent BoM wall (the significance walk carries the lane).
 */
function structuralBoMWall(
  entry: number,
  direction: 'LONG' | 'SHORT',
  designated: ZoneModel,
  targetModel: ChartModel,
): ZoneModel | null {
  const wantType = direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const ref = direction === 'LONG' ? designated.bottom : designated.top;
  const candidates = targetModel.zones
    .filter((z) => {
      if (z.classification !== 'BoM' || z.type !== wantType) return false;
      if (strongestInternalLqzRung(z, direction, targetModel.lmv.table) === null) return false;
      return direction === 'LONG' ? z.top < ref : z.bottom > ref;
    })
    .sort((a, b) => {
      if (direction === 'LONG') {
        return (b.top - a.top) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); // highest ceiling below
      }
      return (a.bottom - b.bottom) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); // lowest floor above
    });
  return candidates.length > 0 ? candidates[0]! : null;
}

/**
 * The primary structural TP (Wave H1, FIX PLAN §2 — "NEVER have I said
 * 'the nearest'"): resolve the shapeDay-projected OPPOSING zone — the E2
 * CORE's designated BoM wall (ShapeDayZone.demandZoneId for SHORT /
 * supplyZoneId for LONG — the pair brain's dual-side designations) — to
 * its internal LQZ rung's defendedEdge (the fresh wall the move will
 * ACTUALLY react at).
 *
 *   1. The projected zone IS an LMV rung (exact lmvAnchorId / center-
 *      suffix match): the rung IS the internal LQZ. Fresh (zfp ≤ 20) +
 *      direction-sane → TP = the rung's defendedEdge. A worked shelf
 *      (zfp > 20) is not a BoM-class wall → null.
 *   2. The projected zone is an OB zone (exact id) WITH a fresh internal
 *      LQZ: BoM-class ⟺ classification 'BoM' OR contains an internal fresh
 *      rung (zfp ≤ 20, the opposing side). TP = the strongest fresh
 *      internal LQZ rung's defendedEdge (the Fire with the Earth inside).
 *   3. The projected zone is a bare BoM wall (NO fresh internal LQZ — its
 *      band sits above/below every rung band): the structurally-equivalent
 *      BoM wall = the day-anchored wall (dayAnchoredBoMWall) → TP = its
 *      strongest fresh internal LQZ rung's defendedEdge.
 *   Hard direction-sanity: a same-side projection is never a TP → null.
 */
function structuralOpposingLqz(
  entry: number,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
  targetPair: string,
  projectedId: string,
  pipValue: number,
  e1Walls: boolean,
): { tp: number; rungId: string } | null {
  // 1. The projected zone IS the internal LQZ rung itself.
  const centerTail = /([0-9.]+)$/.exec(projectedId);
  const centerKey = centerTail ? `|${Number(centerTail[1]).toFixed(5)}` : '';
  const lmvMatch = targetModel.lmv.table.find((z) => lmvAnchorId(targetPair, z) === projectedId)
    ?? (centerKey !== ''
      ? targetModel.lmv.table.find((z) => lmvAnchorId(targetPair, z).endsWith(centerKey))
      : undefined);
  if (lmvMatch) {
    if (lmvMatch.zfp > 20) return null; // a worked shelf — not an unmitigated wall
    // ZR-7B (the E2-authority restoration — the operator's law "E2
    // DESIGNATES, E3 OBEYS" + the 2026-07-31 ruling "make E2 designations
    // AUTHORITATIVE — exact keyZoneId match → return immediately"): the
    // projectedId IS the E2's direct rung designation — a fresh unmitigated
    // wall (zfp ≤ 20) — the AUTHORITATIVE TP terminal. The ZR-3.4
    // shallow-shelf pass-through (the e1Walls extension) applies to the
    // WALK's intermediate caps (mirror.ts:2697-2712 — the non-designated
    // shelves between the entry and the terminal), NEVER to the designated
    // terminal itself — the extension firing here overrode the E2's pick
    // and extended the EU Mon SHORT's TP past the operator's demand LQZ
    // (1.14110) to the deep BoM (1.13886) — the ZR-7B gate caught it. The
    // D37-era extension case (the projected OB's internal rung — the GU
    // Mon's 1.33720 shelf) lives in branch 2 below — UNCHANGED. ──
    const tp = e1Walls
      ? strengthDrivenRungTp(lmvMatch, bridgedLmvZone(targetModel, targetPair, lmvMatch), direction, pipValue)
      : lmvMatch.defendedEdge;
    if (direction === 'LONG' ? tp > entry : tp < entry) {
      return { tp, rungId: lmvAnchorId(targetPair, lmvMatch) };
    }
    return null; // same-side projection — never a fabricated TP
  }
  // 2. The projected zone is an opposing S/D zone with a fresh internal LQZ.
  const ob = targetModel.zones.find((z) => z.id === projectedId);
  if (ob) {
    const internal = strongestInternalLqzRung(ob, direction, targetModel.lmv.table);
    if (internal) {
      // ZR-3.4: the projected wall's internal fuel is a SHALLOW shelf →
      // PASS-THROUGH — the TP extends to the first structural wall beyond
      // the shelf (the D37: the GU Mon's projected BoM's internal rung IS
      // the 1.33720 shelf — the structurally-correct terminal is the 4H
      // MoM's internal LQZ).
      if (e1Walls) {
        const bridged = bridgedLmvZone(targetModel, targetPair, internal);
        if (bridged && !isStructuralWall(bridged)) {
          const ext = extendThroughShallowShelf(internal.center, direction, targetModel, targetPair, pipValue);
          if (ext && (direction === 'LONG' ? ext.tp > entry : ext.tp < entry)) return ext;
        }
      }
      const tp = e1Walls
        ? strengthDrivenRungTp(internal, bridgedLmvZone(targetModel, targetPair, internal), direction, pipValue)
        : internal.defendedEdge;
      if (direction === 'LONG' ? tp > entry : tp < entry) {
        return { tp, rungId: lmvAnchorId(targetPair, internal) };
      }
      return null; // same-side internal LQZ — never a fabricated TP
    }
  }
  // 3. The designated wall is a bare BoM (no fresh internal LQZ — its band
  //    sits above/below every rung band): the structurally-equivalent BoM
  //    wall = the FIRST BoM wall the move reaches on its way to the
  //    designation (structuralBoMWall) → TP = its internal LQZ.
  if (ob) {
    const anchored = structuralBoMWall(entry, direction, ob, targetModel);
    if (anchored) {
      const internal = strongestInternalLqzRung(anchored, direction, targetModel.lmv.table);
      if (internal) {
        const tp = e1Walls
          ? strengthDrivenRungTp(internal, bridgedLmvZone(targetModel, targetPair, internal), direction, pipValue)
          : internal.defendedEdge;
        if (direction === 'LONG' ? tp > entry : tp < entry) {
          return { tp, rungId: lmvAnchorId(targetPair, internal) };
        }
      }
    }
    // ── ZR-3.3 (2026-08-04 — the D37 #2/#3 killer; the mirror lane only —
    //    e1Walls): the E2-projected OB zone EXISTS but resolves to no
    //    internal LQZ and no structurally-equivalent BoM wall (the
    //    OB-id-vs-LMV-candidates mismatch fell through SILENTLY to the
    //    nearest-first walk — the GU Mon's TP stuck at the 1.33720 shelf,
    //    RRR 1.9). The E2's projected opposing zone is the PRIMARY TP
    //    target ("TP should be exteneded to the STRUCTURALLY CORRECT zone
    //    based on E2 shape chain + E1 pressure mechanics") → the TP = the
    //    OB's own defended edge (the E1 pressure edge) with the ZR-3.2
    //    strength-driven edge. It resolves or fails loudly — never a
    //    silent fall-through. Gated to the mirror lane: the DXY source
    //    lane's calls (refinement-machine/setup-gen, no flag) keep the
    //    frozen fall-through — byte-identical. ──
    if (e1Walls) {
      const edgeTp = strengthDrivenZoneTp(ob, direction, pipValue);
      if (direction === 'LONG' ? edgeTp > entry : edgeTp < entry) return { tp: edgeTp, rungId: ob.id };
      return null; // same-side — never a fabricated TP
    }
  }
  return null;
}

/**
 * The Law-14 TP walk over the LmvTable (§5.2: "tp = law14Walk_LMV"). The
 * opposing rungs (LONG → SELL_SIDE above entry; SHORT → BUY_SIDE below)
 * are significance-ranked — L4 (2026-07-31) SWEEP-BONUS INVERSION: a swept
 * rung's liquidity was TAKEN, so it is DEMOTED as a TP target (−30), never
 * promoted; a fresh Hard Wall (zfp ≤ 20) is the strongest (+40), a
 * mid-worked zone (20 < zfp ≤ 30) next (+25), a heavily-worked shelf
 * (zfp > 30) the weakest (+15) — then nearest-first. The walk
 * caps at the nearest FRESH wall (zfp ≤ 20 — the effectively-unmitigated
 * rung) between entry and target; a cap whose own TP fails the viable-RRR
 * precondition (≥ 1.2× SL) is passed through, not rejected (the v4.4.0c
 * cap-skip doctrine). TP = the effective rung's defendedEdge (§5.2).
 * No LMV opposing rung → the v4.4 ladder walk (computeMirrorTP) is the
 * documented fallback (the model's §7 ladder remains a valid TP substrate).
 *
 * v4.5.x REFINEMENT 1 (opts.passThroughWeakWalls): WEAK walls — the
 * heavily-worked shelves zfp > 30 (the LMV analog of the ladder walk's
 * weak-wall vote: a shelf that worked all week is conditional, not a
 * Hard Wall) — are PASS-THROUGH as terminal targets: the walk targets
 * the first non-weak opposing rung (the significance-ranked rung,
 * FURTHER than the weak shelf). The cap doctrine is untouched and
 * already compliant: caps bind ONLY at fresh Hard Walls (zfp ≤ 20 —
 * the STRONG fresh rung; Law-14 preserved, never pass through an
 * unmitigated strong zone).
 */
export function computeLmvTP(
  entry: number,
  sl: number,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
  targetPair: string,
  pipValue: number,
  opts?: MirrorTpOptions,
  shapeDay?: ShapeDayZone,
): { tp: number; rungId: string } | null {
  const slDistPips = Math.abs(entry - sl) / pipValue;
  if (slDistPips <= 0) return null;
  const minTpDistPips = MIN_TP_SL_RATIO * slDistPips;
  const weakPass = opts?.passThroughWeakWalls === true;
  // ZR-3.4: the E1-pressure wall classification (the mirror lane opts in —
  // the DXY source lane's calls carry no flag → byte-identical).
  const e1Walls = opts?.e1PressureClassification === true;

  // ── Wave H1 (2026-08-01, FIX PLAN §2): THE PRIMARY STRUCTURAL TP — the
  //    structurally-equivalent opposing BoM wall's internal LQZ. The E2
  //    CORE's projected opposing zone (the ShapeDayZone's demandZoneId for
  //    SHORT / supplyZoneId for LONG — the pair brain's dual-side
  //    designation) is the opposing S/D zone; the TP = the fresh internal
  //    LQZ rung's defendedEdge (the Earth within the Fire — the level the
  //    move will ACTUALLY react at). "NEVER have I said 'the nearest'"
  //    (FIX PLAN §2.1): the significance walk below is the FALLBACK ONLY
  //    (when no unmitigated BoM wall exists on the opposing side). Hard
  //    direction-sanity: a same-side projection falls through to the walk
  //    (never a fabricated same-side TP). When shapeDay is absent this
  //    path is skipped (byte-identical to the walk-only lane). ──
  if (shapeDay) {
    const projectedId = direction === 'SHORT' ? shapeDay.demandZoneId : shapeDay.supplyZoneId;
    if (projectedId) {
      const structural = structuralOpposingLqz(entry, direction, targetModel, targetPair, projectedId, pipValue, e1Walls);
      if (structural) {
        // Law-14 path check (FIX PLAN §2.2 STEP 3): UNMITIGATED zones
        // between entry and TP react FIRST (price cannot teleport) → the
        // TP moves to the first UM zone; MITIGATED zones (the week's
        // action passed through them) are pass-through during BS momentum
        // (the golden T6 proof: 55.5p through 5 mitigated zones to the UM
        // 100.680). A zero-reaction opposing OB zone in the path is UM.
        const pathCap = firstUnmitigatedOpposingZone(entry, structural.tp, direction, targetModel);
        if (pathCap) {
          // The cap's own TP must pay (the viable-RRR precondition — a cap
          // that cannot pay is noise, pass through it); the structural
          // wall's rung id rides as the provenance.
          if (Math.abs(pathCap.level - entry) / pipValue >= minTpDistPips) {
            return { tp: pathCap.level, rungId: pathCap.zoneId };
          }
        }
        return structural;
      }
    }
  }

  const opposing = targetModel.lmv.table.filter((z) =>
    direction === 'LONG'
      ? z.side === 'SELL_SIDE' && z.center > entry
      : z.side === 'BUY_SIDE' && z.center < entry);
  if (opposing.length === 0) return null;

  // L4 (2026-07-31): SWEEP-BONUS INVERSION — a swept rung's liquidity is
  // TAKEN, so it is DEMOTED as a TP target, not promoted. (NEXT_STEPS.md:47-53:
  // the GU TP landed one rung too shallow → RRR 1.30 → RRR_DISCARDED → GU lane
  // dead. Evidence: [1.34081-1.34116] defEdge 1.34111 zfp 60 sweeps 1 → sig 90
  // was WRONG; fresh Hard Walls zfp≤20 must outrank it.)
  const significance = (z: LqzZoneMatrix): number =>
    (z.sweepCount >= 1 ? -30 : 0) +
    (z.zfp <= 20 ? 40 : z.zfp <= 30 ? 25 : 15);
  const ranked = opposing
    .map((z) => ({ z, sig: significance(z), dist: Math.abs(z.center - entry) }))
    // v4.5.x R1: a weak shelf (zfp > 30) is never the terminal target —
    // price passes through it to the first non-weak opposing rung.
    .filter((c) => !weakPass || c.z.zfp <= 30)
    .sort((a, b) => (b.sig - a.sig) || (a.dist - b.dist) || (a.z.center - b.z.center));

  const skippedCapIds = new Set<string>();
  for (const { z: target } of ranked) {
    const targetId = lmvAnchorId(targetPair, target);
    // The cap-walk: the nearest FRESH wall between entry and target caps
    // the TP. ZR-3.4 (the D37 #1 killer): with e1PressureClassification the
    // wall predicate is the E1 PRESSURE classification (isStructuralWall —
    // the shallow LMV shelves, confluence 0 non-fortress, are PASS-THROUGH;
    // the canon LQZ ladder floors at zfp 20 so the old zfp ≤ 20 predicate
    // fired on EVERY rung and capped the walk at the nearest shelf).
    // Default (no flag): the frozen zfp ≤ 20 "fresh wall" (Law-14
    // effectively-unmitigated semantics) — the source lane byte-identical.
    const caps = targetModel.lmv.table
      .filter((z) => {
        if (skippedCapIds.has(lmvAnchorId(targetPair, z))) return false;
        if (z.center === target.center) return false;
        if (e1Walls) {
          const bridged = bridgedLmvZone(targetModel, targetPair, z);
          const structural = bridged ? isStructuralWall(bridged) : z.zfp <= 20;
          if (!structural) return false; // a shallow shelf — pass-through
        } else if (z.zfp > 20) return false;
        return direction === 'LONG'
          ? z.center > entry && z.center < target.center
          : z.center < entry && z.center > target.center;
      })
      .sort((a, b) =>
        (direction === 'LONG' ? a.center - b.center : b.center - a.center));
    const effective = caps.length > 0 ? caps[0]! : target;
    const effectiveId = lmvAnchorId(targetPair, effective);
    // ZR-3.4: the walk's effective rung is a SHALLOW shelf → PASS-THROUGH —
    // terminate at the first STRUCTURAL wall beyond (its internal LQZ).
    if (e1Walls) {
      const bridgedEff = bridgedLmvZone(targetModel, targetPair, effective);
      if (bridgedEff && !isStructuralWall(bridgedEff)) {
        const ext = extendThroughShallowShelf(effective.center, direction, targetModel, targetPair, pipValue);
        if (ext) {
          const extSane = direction === 'LONG' ? ext.tp > entry : ext.tp < entry;
          if (extSane && Math.abs(ext.tp - entry) / pipValue >= minTpDistPips) {
            return { tp: ext.tp, rungId: ext.rungId };
          }
        }
      }
    }
    // ZR-3.2: the strength-driven TP edge (STRONG → close edge + the 1-2p
    // spread; WEAK → the far edge; MIDDLE → the defendedEdge — the LMV-rung
    // targets are byte-identical under MIDDLE). Gated with e1Walls (the
    // mirror lane); the source lane keeps the defendedEdge verbatim.
    const tp = e1Walls
      ? strengthDrivenRungTp(effective, bridgedLmvZone(targetModel, targetPair, effective), direction, pipValue)
      : effective.defendedEdge;

    if (direction === 'LONG' && tp <= entry) continue;
    if (direction === 'SHORT' && tp >= entry) continue;
    if (Math.abs(tp - entry) / pipValue < minTpDistPips) {
      if (effectiveId !== targetId) skippedCapIds.add(effectiveId);
      continue;
    }
    // ── Wave H1 MoM-to-BoM extension (FIX PLAN §2.2 STEP 4): the walk's
    //    effective target is always an LMV rung (MoM-class by construction
    //    — lqz-matrix.ts:647). When a structurally-equivalent BoM wall
    //    (an opposing BoM OB zone with a fresh internal LQZ) exists BEYOND
    //    it, the TP EXTENDS to that wall's internal LQZ — the TP never
    //    stops at a MoM shelf when a BoM wall exists. ──
    if (opts?.structuralExtension === true) {
      const bomWall = nearestBoMWallBeyond(entry, effective, direction, targetModel);
      if (bomWall) {
        const internal = strongestInternalLqzRung(bomWall, direction, targetModel.lmv.table);
        if (internal) {
          const extTp = e1Walls
            ? strengthDrivenRungTp(internal, bridgedLmvZone(targetModel, targetPair, internal), direction, pipValue)
            : internal.defendedEdge;
          const sane = direction === 'LONG' ? extTp > entry : extTp < entry;
          if (sane && Math.abs(extTp - entry) / pipValue >= minTpDistPips) {
            return { tp: extTp, rungId: lmvAnchorId(targetPair, internal) };
          }
        }
      }
    }
    return { tp, rungId: effectiveId };
  }
  return null;
}

/**
 * The MoM-to-BoM extension's wall search (Wave H1): the nearest BoM OB
 * zone (opposing type) STRICTLY BEYOND the walk's effective target
 * (further from entry) with a fresh internal LQZ. Null → no BoM wall
 * beyond (the MoM shelf stands — honest).
 */
function nearestBoMWallBeyond(
  entry: number,
  effective: LqzZoneMatrix,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
): ZoneModel | null {
  const wantType = direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const effMid = effective.center;
  const candidates = targetModel.zones
    .filter((z) => {
      if (z.classification !== 'BoM' || z.type !== wantType) return false;
      if (strongestInternalLqzRung(z, direction, targetModel.lmv.table) === null) return false;
      const mid = (z.bottom + z.top) / 2;
      return direction === 'LONG' ? mid > effMid : mid < effMid;
    })
    .sort((a, b) => {
      const ma = (a.bottom + a.top) / 2;
      const mb = (b.bottom + b.top) / 2;
      return (direction === 'LONG' ? ma - mb : mb - ma) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
  return candidates.length > 0 ? candidates[0]! : null;
}

/**
 * ZR-3.4 (2026-08-04 — the D37 #1 killer) — THE SHALLOW-SHELF PASS-THROUGH.
 * A resolved TP target whose rung is a shallow LQZ shelf (NOT a structural
 * wall per the E1 pressure classification — the LMV-bridge, confluence-0,
 * non-fortress shelves the canon zfp ladder floors at 20) is PASS-THROUGH:
 * the TP extends to the first STRUCTURAL opposing wall beyond the shelf
 * (isStructuralWall — real defensive pressure) → the wall's fresh internal
 * LQZ (the Earth within the Fire) with the ZR-3.2 strength-driven edge;
 * no internal LQZ → the wall's own strength-driven defended edge (the
 * ZR-3.3 rule). The wall's structural status validates its internal rung
 * as the terminal (no recursion). No structural wall beyond → null (the
 * shelf target STANDS — honest, never fabricated).
 *
 * The doctrine (the operator, the D37 fix direction): "the walk then
 * passes through the shallow shelves (LMV, confluence 0, non-fortress) and
 * terminates at the first STRUCTURAL wall (→ its internal LQZ)".
 */
function extendThroughShallowShelf(
  shelfLevel: number,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
  targetPair: string,
  pipValue: number,
): { tp: number; rungId: string } | null {
  const wantType = direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const walls = targetModel.zones
    .filter((z) => {
      if (z.id.startsWith('LMV|')) return false;
      // The institutional-overlay bands (source='PILLAR', §8.1: "confluence/
      // ZFP/context + SL/TP rungs, NEVER entries") are valid path-CAP levels
      // (the Law-14 UM check reads them) but NOT the pass-through's terminal
      // wall: the terminal is the E1 zone map's S/D structure with the
      // Earth+Fire overlap (the operator's D37 walk: "terminates at the
      // first STRUCTURAL wall (the 4H MoM OB → its internal LQZ)") — the
      // bare 10-pip IP bands carry no candle-anatomy pressure of their own.
      if (z.id.startsWith('IP|')) return false;
      if (z.type !== wantType) return false;
      if (!isStructuralWall(z)) return false;
      // strictly beyond the shelf: the wall's approach edge is deeper than the shelf
      return direction === 'LONG' ? z.bottom > shelfLevel : z.top < shelfLevel;
    })
    .sort((a, b) =>
      (direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const wall of walls) {
    const internal = strongestInternalLqzRung(wall, direction, targetModel.lmv.table);
    // THE EARTH+FIRE RULE (the operator's wall classification: "the
    // BoM/MoM classification, the zfp from the pressure ladder + the
    // confluence, the Earth+Fire overlap"): the terminal wall of the
    // pass-through walk must carry a REAL internal LQZ (the Earth within
    // the Fire) whose resolution lands STRICTLY BEYOND the shelf — a bare
    // 10-pip institutional band (no internal rung) or a band whose
    // "internal" rung IS the shelf's own band is NOT the structural wall
    // → walk on.
    if (!internal) continue;
    const tp = strengthDrivenRungTp(internal, bridgedLmvZone(targetModel, targetPair, internal), direction, pipValue);
    if (direction === 'LONG' ? tp > shelfLevel : tp < shelfLevel) {
      return { tp, rungId: lmvAnchorId(targetPair, internal) };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §6.2 — THE CS-1 STRUCTURAL-VALIDITY GUARD (MANDATORY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * structurallyValid — the "would a human place this trade?" check,
 * mechanized (§6.2 EXACT). A trade whose SL is already violated by the
 * session-open price is a guaranteed loss, not a trade (LOSS_AUTOPSY CS-1:
 * EU #3 open 1.14195 > SL 1.1418; EU #4 open 1.14317 > SL 1.1431).
 * Enforcement: applied at mirror construction (reAnchorMirror) — a
 * CS-1-invalid mirror is declared invalid + honestly discarded with the
 * reason, NEVER emitted.
 */
export function structurallyValid(
  setup: { sl: number },
  sessionStartPrice: number,
  direction: 'LONG' | 'SHORT',
): { valid: boolean; reason: string } {
  if (direction === 'SHORT' && sessionStartPrice >= setup.sl) {
    return {
      valid: false,
      reason: `CS-1: session-open price ${sessionStartPrice} already beyond SL ${setup.sl} (structurally un-enterable SHORT)`,
    };
  }
  if (direction === 'LONG' && sessionStartPrice <= setup.sl) {
    return {
      valid: false,
      reason: `CS-1: session-open price ${sessionStartPrice} already beyond SL ${setup.sl} (structurally un-enterable LONG)`,
    };
  }
  return { valid: true, reason: 'OK: session-open price has not violated the SL' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §7.2/§7.3 — THE NARRATIVE-ALIGNMENT GATE (counter-structure weight)
// ═══════════════════════════════════════════════════════════════════════════════

/** The narrative gate's setup view (the fields the §7.3 predicates read). */
export interface NarrativeSetupRef {
  direction: 'LONG' | 'SHORT';
  entry: number;
  /** The anchor zone's zfp — the strength input (suppress > 30, exempt < 20). */
  zfp: number;
}

/** The narrative gate's model context (all in-model, deterministic). */
export interface NarrativeGateContext {
  spot: number;
  atrPips: number;
  pipValue: number;
}

export interface NarrativeGateResult {
  aligned: boolean;
  reason: string;
  /** TRUE → emit with COUNTER_STRUCTURE_FLAG (the Law-20 exemption). */
  flagged: boolean;
}

/**
 * narrativeAligned — the weekly-narrative weight (§7.2 + the §7.3
 * mechanical predicates):
 *   fightsBreak — the entry fights a confirmed range break: theBreak set,
 *     trade day ≥ break day, direction AGAINST the break, and the entry on
 *     the BROKEN side of the range (the side the break left: above the
 *     pierced level for a DOWN break, below for UP).
 *   fightsSweepRecovery — the entry fights a post-sweep reversal:
 *     sweepOrigin set, trade day ≥ sweep day, direction opposes the
 *     reversal (SWEEP_LOW → reversal UP → SHORTs fight; SWEEP_HIGH →
 *     reversal DOWN → LONGs fight), entry within 1×ATR of the sweep
 *     extreme (the reversal's origin).
 *   fightsConfirmedTrend — the entry fights a confirmed extreme + trend:
 *     range top/bottom with rejection reactions, the trade day is AFTER
 *     the extreme's latest reaction (the decline/rally is established,
 *     ≥ 1 day), spot has TRENDED AWAY ≥ 0.5×ATR, and the direction fights
 *     that trend (LONGs into a confirmed-top decline; SHORTs into a
 *     confirmed-bottom rally).
 * The zfp interaction (§7.2): suppression binds ONLY weak zones
 * (zfp > 30); a Hard Wall (zfp < 20) is EXEMPT — allowed with
 * flagged=TRUE (the Law-20 counter-trend-scalp exemption). The 20-30 band
 * is allowed with the flag (documented middle-band choice).
 */
export function narrativeAligned(
  setup: NarrativeSetupRef,
  narrative: WeeklyNarrative,
  day: string,
  ctx: NarrativeGateContext,
): NarrativeGateResult {
  const atr = ctx.atrPips * ctx.pipValue;
  const fights: string[] = [];

  // ── fightsBreak (§7.3) ──
  const brk = narrative.theBreak;
  if (brk && day >= dayKeyOfMs(brk.ms)) {
    const against =
      (brk.direction === 'UP' && setup.direction === 'SHORT') ||
      (brk.direction === 'DOWN' && setup.direction === 'LONG');
    const onBrokenSide = brk.direction === 'DOWN'
      ? setup.entry > brk.piercedLevel
      : setup.entry < brk.piercedLevel;
    if (against && onBrokenSide) {
      fights.push(`fightsBreak(${brk.direction} break through ${brk.piercedLevel} on ${dayKeyOfMs(brk.ms)})`);
    }
  }

  // ── fightsSweepRecovery (§7.3) ──
  const sw = narrative.sweepOrigin;
  if (sw && day >= dayKeyOfMs(sw.ms)) {
    const reversalUp = sw.anatomy === 'SWEEP_LOW';
    const opposes =
      (reversalUp && setup.direction === 'SHORT') ||
      (!reversalUp && setup.direction === 'LONG');
    if (opposes && Math.abs(setup.entry - sw.price) <= atr) {
      fights.push(`fightsSweepRecovery(${sw.anatomy} @ ${sw.price} on ${dayKeyOfMs(sw.ms)})`);
    }
  }

  // ── fightsConfirmedTrend (§7.3) ──
  const rt = narrative.rangeTop;
  if (rt && rt.reactions.length > 0 && setup.direction === 'LONG') {
    let latest = 0;
    for (const r of rt.reactions) if (r.lastTouchMs > latest) latest = r.lastTouchMs;
    if (day > dayKeyOfMs(latest) && ctx.spot < rt.price - 0.5 * atr) {
      fights.push(`fightsConfirmedTrend(confirmed top ${rt.price}, trended away since ${dayKeyOfMs(latest)})`);
    }
  }
  const rb = narrative.rangeBottom;
  if (rb && rb.reactions.length > 0 && setup.direction === 'SHORT') {
    let latest = 0;
    for (const r of rb.reactions) if (r.lastTouchMs > latest) latest = r.lastTouchMs;
    if (day > dayKeyOfMs(latest) && ctx.spot > rb.price + 0.5 * atr) {
      fights.push(`fightsConfirmedTrend(confirmed bottom ${rb.price}, trended away since ${dayKeyOfMs(latest)})`);
    }
  }

  if (fights.length === 0) {
    return { aligned: true, reason: 'OK: no weekly-narrative conflict', flagged: false };
  }
  const base = `CS-3: counter-structure (${fights.join('; ')})`;
  if (setup.zfp > ZFP_SUPPRESS_ABOVE) {
    return {
      aligned: false,
      reason: `${base} — weak zone zfp ${setup.zfp} > ${ZFP_SUPPRESS_ABOVE} → SUPPRESSED (§7.2)`,
      flagged: false,
    };
  }
  return {
    aligned: true,
    reason: `${base} — zone zfp ${setup.zfp} ≤ ${ZFP_SUPPRESS_ABOVE} → allowed with COUNTER_STRUCTURE_FLAG (Law-20 exemption)`,
    flagged: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §5.2 — reAnchorMirror: the v4.5 mirror construction (80% signal + 20%
// pair-native optimization, + the MANDATORY CS-1 guard + the narrative gate)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * reAnchorMirror — construct ONE v4.5 mirror trade on the target pair's
 * own geometry. The 80% signal (direction inverse/same, zone class) is
 * inherited verbatim; the 20% (anchor zone, E/SL/TP levels) is re-anchored
 * to the target's OWN strong zone via selectPairNativeZone + the LMV
 * defendedEdge/reactionExtreme reductions. Returns null when no
 * pair-native zone of the source's class exists (honest FAILED anchor —
 * the caller logs it).
 *
 * Construction order (every failure honest, logged, never silently repaired):
 *   anchor (§5.3) → entry = defendedEdge (§5.2) → SL = reaction-extreme
 *   (§5.4, Law-10 floor, D17 ceiling) → TP = Law-14 walk over the LmvTable
 *   (ladder fallback) → RRR on target geometry (canon category floor — 3.0;
 *   R2: an RRR-failed mirror is REPAIRED by the refinement machine — up to 3
 *   surgical E/SL/TP attempts on the SAME zone anchors, then hard-reject with
 *   the D36 audit trail) → CS-1 structural-validity guard (§6.2, MANDATORY
 *   when the session-start price is known) → narrative-alignment gate (§7.2,
 *   suppress weak-zone counter-structure, flag Hard-Wall exemptions).
 */
export function reAnchorMirror(
  source: TradeSetup | MirrorOutcomeV45,
  targetModel: ChartModel,
  targetPair: string,
  ctx?: MirrorReanchorContext,
): MirrorOutcomeV45 | null {
  const pipValue = PIP_VALUE[targetPair] ?? PIP_VALUE_DEFAULT;
  const category = sourceCategoryOf(source);
  const mirrorOf = mirrorOfOf(source);
  const srcDir = sourceDirectionOf(source);
  const zoneClass = zoneClassOf(source);

  const inert = (
    status: MirrorStatus,
    discardReason: string,
    geometry?: { direction?: 'LONG' | 'SHORT'; entry?: number; sl?: number; tp?: number; slMethod?: string; tpRungId?: string | null },
    anchorInfo?: { anchorZoneId: string; anchorKind: 'ORDER_BLOCK' | 'LQZ'; anchorFormationMs: number; anchorZfp: number; anchorDefendedEdge: number; anchorReactionExtreme: number | null; tradeMs: number; tradeDay: string },
    flags?: string[],
  ): MirrorOutcomeV45 => ({
    sourceSetupId: sourceIdOf(source),
    anchorZoneId: anchorInfo?.anchorZoneId ?? 'NONE',
    pair: targetPair,
    category,
    session: anchorInfo && anchorInfo.tradeMs > 0 ? sessionOf(anchorInfo.tradeMs) : null,
    mirrorOf,
    direction: geometry?.direction ?? (srcDir === 'NEUTRAL' ? 'LONG' : srcDir),
    entry: geometry?.entry ?? 0,
    sl: geometry?.sl ?? geometry?.entry ?? 0,
    tp: geometry?.tp ?? geometry?.entry ?? 0,
    rrr: 0,
    status,
    discardReason,
    slMethod: geometry?.slMethod ?? 'none',
    tpRungId: geometry?.tpRungId ?? null,
    zoneClass,
    anchorKind: anchorInfo?.anchorKind ?? 'ORDER_BLOCK',
    anchorFormationMs: anchorInfo?.anchorFormationMs ?? 0,
    anchorZfp: anchorInfo?.anchorZfp ?? 0,
    anchorDefendedEdge: anchorInfo?.anchorDefendedEdge ?? 0,
    anchorReactionExtreme: anchorInfo?.anchorReactionExtreme ?? null,
    tradeMs: anchorInfo?.tradeMs ?? 0,
    tradeDay: anchorInfo?.tradeDay ?? '',
    flags: flags ?? [],
  });

  // A directionless source cannot be mirrored (totality — honest invalid).
  if (srcDir === 'NEUTRAL') {
    return inert('SOURCE_INVALID',
      `${targetPair} mirror of ${mirrorOf}: source direction NEUTRAL — cannot mirror a directionless setup`);
  }

  // ── 80% SIGNAL: DIRECTION (§9.3: DXY→EU INVERTS; EU→GU KEEPS) ──
  const direction: 'LONG' | 'SHORT' =
    source.pair === 'DXY' ? (srcDir === 'LONG' ? 'SHORT' : 'LONG') : srcDir;

  // ── 20% PAIR-NATIVE: the anchor (§5.3 — class + side + strength;
  //    v4.5.x R2 consumed-pool tiers + R3 distribution exclusions) ──
  let anchor = selectPairNativeZone(
      targetModel.lmv.table,
      targetModel.zones,
      zoneClass,
      direction,
      ctx?.sourceFormationMs ?? NaN,
      targetModel.spot,
      {
        excludedIds: ctx?.excludedAnchorIds,
        week: targetModel.anchor,
        // v4.5.5 RE-PORT WIRING (PRISTINE :1858): the class-flexible LQZ
        // fallback (v452.guAnchorPoolV453) enriches the OB-class pool with
        // the target's LMV rungs at group −1.5 when the class-locked pool
        // collapses — the GU ×N-collapse killer (the operator's rung map:
        // 1.3380/1.3397/1.3400/1.3410/1.3436/1.3440 — all on rungs).
        classFlexibleLQZFallback: ctx?.v452?.guAnchorPoolV453 === true,
      },
      ctx?.shapeDay,
    );
  // v4.5.2 §8.1 fallback: if the primary class pool is empty, try LQZ class
  // (the LMV table). This unlocks the golden-standard levels that exist as
  // LMV rungs but not as OB zones of the source's class.
  if (!anchor && zoneClass !== 'LQZ') {
    anchor = selectPairNativeZone(
      targetModel.lmv.table, targetModel.zones, 'LQZ',
      direction, ctx?.sourceFormationMs ?? NaN, targetModel.spot,
      { excludedIds: ctx?.excludedAnchorIds, week: targetModel.anchor },
      ctx?.shapeDay,
    );
  }
  if (!anchor) return null; // honest FAILED anchor — the caller logs it

  const anchorKind: 'ORDER_BLOCK' | 'LQZ' = isLqzAnchor(anchor) ? 'LQZ' : 'ORDER_BLOCK';
  const anchorZoneId = isLqzAnchor(anchor) ? lmvAnchorId(targetPair, anchor) : anchor.id;
  const anchorFormationMs = isLqzAnchor(anchor)
    ? (anchor.candles.length > 0 ? anchor.candles[0]!.timestamp : 0)
    : anchor.formationMs;
  const anchorZfp = anchor.zfp;
  // v4.5.x R2: a CONSUMED anchor (the recently-battled / rank-nearest
  // fallback) arms the SL volatility check + carries the provenance flag.
  const anchorConsumed = !isLqzAnchor(anchor) && anchor.freshness === 'DEPLETED';

  // ── Entry for an E2-designated anchor = the resolved zone's internal LQZ
  //    rung's NEAR EDGE (ZR-6A/B, the E3 PRICE RESOLUTION — the E2 price is
  //    GONE: "E2 generates SHAPE CHAIN from ZONE ANCHORS (prices are not
  //    even a variable for E2). E3 generates trade setups at specific price
  //    levels on top of the E2 shape chain."). The operator's Rule E1:
  //    "LQZ at 1.1444 - 1.14395 ~ using this as the entry zone anchor" — the
  //    entry 1.14395 = the LQZ's near edge from above (SHORT → the rung's
  //    floor; LONG → the rung's ceiling — the SAME §8.1 internal-rung edge
  //    semantics as the DXY source lane's F1-C). "E2 DESIGNATES, E3 OBEYS."
  //    The defendedEdge is the fallback ONLY when no E2 designation exists
  //    (or the anchor isn't the designated zone, or the zone carries no
  //    internal LQZ on its side — honest absence, §12 Law 3). ──
  const e2MatchId = ctx?.shapeDay
    ? (direction === 'LONG'
        ? (ctx.shapeDay.demandZoneId ?? ctx.shapeDay.keyZoneId)
        : (ctx.shapeDay.supplyZoneId ?? ctx.shapeDay.keyZoneId))
    : undefined;
  const e2Designated = e2MatchId != null && (e2MatchId === anchorZoneId ||
    e2MatchId === (isLqzAnchor(anchor) ? anchorZoneId : anchor.id));
  const { entry, overlap } = e2Designated
    ? e2ZoneResolvedEntry(anchor, direction, targetModel, targetPair, pipValue, ctx?.shapeDay?.shape)
    : defendedEdgeEntry(anchor, direction, targetModel.lmv.table);

  // ── SL = the reaction-extreme SL on the TARGET's LmvTable (§5.4; v4.5.x
  //    R2 volatility check for consumed anchors) ──
  const slResult = computeReactionExtremeSL(entry, anchor, overlap, direction, targetModel, targetPair, pipValue, anchorConsumed);
  const anchorInfo = {
    anchorZoneId,
    anchorKind,
    anchorFormationMs,
    anchorZfp,
    anchorDefendedEdge: entry,
    anchorReactionExtreme: slResult?.rxExt ?? (isLqzAnchor(anchor) ? anchor.reactionExtreme : null),
    tradeMs: 0,
    tradeDay: '',
  };
  if (!slResult) {
    return inert('SL_INVALID',
      `${targetPair} mirror of ${mirrorOf}: no LMV rung within the D17 ${D17_SL_CEILING_PIPS}-pip ceiling beyond the re-anchored zone — reaction-extreme SL invalid after the rung walk`,
      { direction, entry }, anchorInfo);
  }

  // ── v4.5.5 RE-PORT — THE GOLDEN SL PORT (PRISTINE :1894-1907, ADDITIVE;
  //    default = the v4.5.x SL byte-preserved): computeSL_LMV (sl-lmv.ts —
  //    the golden 4-9.5p reaction-extreme SL) + the selective util guard
  //    (tighten ONLY when util = probe-depth/SL-dist < 0.40; util ≥ 0.40 →
  //    the structural SL is KEPT with the logged justification) + the §4.4.3
  //    wick-clear for consumed anchors. See computeGoldenSL_V452 below. ──
  let slFinal = slResult;
  const slV452Flags: string[] = [];
  // ── WAVE ZR-3.1 (2026-08-04 — the E3 CONDITIONAL ANCHORS): THE
  //    LADDER-STEPS SL is the PRIMARY SL path for the EU/GU mirror lane.
  //    The SL derives from the ZR-1 operative defense (the E1 pressure
  //    state's zone relevance — the trade #4 switch: fuel INTACT → the LQZ
  //    defends first; fuel ABSORBED → the S/D zone itself), NEVER the
  //    candle-count ladder: 3p outside the current step's far edge, or
  //    1.5p inside the next step's close edge when the 3p branch overshoots
  //    it. The frozen golden SL path (computeSL_LMV/computeGoldenSL_V452)
  //    is the FALLBACK when no operative defense exists (the anchor zone
  //    is absent from the model's zone map — honest degradation). ──
  const ladderEntryZoneId = isLqzAnchor(anchor)
    ? `LMV|${targetPair}|${anchor.center.toFixed(5)}`   // the bridged ZoneModel id (index.ts matrixZonesToZoneModels)
    : anchor.id;
  const ladderAsOfMs = !isMirrorOutcome(source) && typeof source.battleMs === 'number' && source.battleMs > 0
    ? source.battleMs
    : undefined;
  // ── ZR-6B (Rule S3 — the CONFIDENCE JUDGMENT): the E1/E2-derived score
  //    rides the ladder call (mirrorConfidenceScore — base 0.5 + the E2 day
  //    confidence + the contested zone's lifecycle/absorption + the
  //    storyline-direction match; clamp [0,1]). ≥ 0.6 → the RR-tight option
  //    (3p outside the back edge); < 0.6 → the safety option (1-2p inside
  //    the next rung's close edge when available). "Lower confidence setups
  //    - default to safety. Higher confidence setups - default to RR." ──
  const ladderSl = computeLadderStepsSL(
    targetModel, ladderEntryZoneId, entry, direction, pipValue,
    {
      ...(ladderAsOfMs !== undefined ? { asOfMs: ladderAsOfMs } : {}),
      confidence: mirrorConfidenceScore(ctx?.shapeDay?.confidence, anchor, direction, ctx?.shapeDay, targetModel, targetPair),
    },
  );
  if (ladderSl) {
    slFinal = {
      sl: ladderSl.sl,
      method: `zr3-ladder-steps-${ladderSl.branch}`,
      rungId: ladderSl.defenseId,
      rxExt: slResult.rxExt,
    };
    slV452Flags.push(`LADDER_STEPS_SL[${ladderSl.branch}]: ${ladderSl.reason}`);
  } else if (ctx?.v452?.goldenSlLmv) {
    const g = computeGoldenSL_V452(entry, anchor, overlap, direction, targetModel, targetPair, pipValue, slResult);
    slFinal = { sl: g.sl, method: g.method, rungId: g.rungId, rxExt: g.rxExt ?? slResult.rxExt };
    slV452Flags.push(...g.flags);
    anchorInfo.anchorReactionExtreme = slFinal.rxExt;
  }

  // ── TP = the opposing rung's defendedEdge via the Law-14 LMV walk ──
  //    (v4.5.0 semantics PRESERVED: the LMV walk already caps ONLY at
  //    fresh Hard Walls — zfp ≤ 20, the STRONG fresh rung — so it is
  //    Refinement-1 compliant by construction. Extending the weak-shelf
  //    pass-through to its TARGET selection was MEASURED and REJECTED:
  //    it pushed targets past the week-end retracement and converted
  //    proven wins to losses — the 2.78R EU wins are the doctrine's
  //    intended range-trade targets, ShapeCode.SS: zone edge → opposing
  //    zone edge).
  let tpResult = computeLmvTP(entry, slFinal.sl, direction, targetModel, targetPair, pipValue, { structuralExtension: true, e1PressureClassification: true }, ctx?.shapeDay);
  if (!tpResult) {
    // Documented fallback: the v4.4 ladder Law-14 walk (the §7 ladder is a
    // valid TP substrate when the LmvTable has no opposing rung) — with
    // the v4.5.x R1 weak-wall pass-through (the v4.5 lane's TP doctrine).
    const ladderAnchor: ZoneModel = {
      id: anchorZoneId,
      type: direction === 'LONG' ? 'DEMAND' : 'SUPPLY',
      top: anchor.top,
      bottom: anchor.bottom,
      timeframe: '1H',
      classification: anchorKind === 'ORDER_BLOCK' ? (anchor as ZoneModel).classification : 'MoM',
      formationMs: anchorFormationMs,
      freshness: 'FRESH',
      reactionEvents: [],
      zfp: anchorZfp,
      confluence: 0,
    };
    tpResult = computeMirrorTP(entry, slFinal.sl, ladderAnchor, direction, targetModel.ladder, pipValue, { passThroughWeakWalls: true, structuralExtension: true });
  }
  if (!tpResult) {
    return inert('TP_NULL',
      `${targetPair} mirror of ${mirrorOf}: no opposing rung of significance passes the Law-14 walk (LMV + ladder fallback; viable-RRR precondition ≥ ${MIN_TP_SL_RATIO}× SL)`,
      { direction, entry, sl: slFinal.sl, slMethod: slFinal.method }, anchorInfo);
  }

  // ── RRR on the TARGET pair's actual geometry (canon category floor) ──
  let rrr = Math.abs(tpResult.tp - entry) / Math.abs(entry - slFinal.sl);
  const floor = rrrForCategory(category).tp1;   // 3.0 — the R1 table (all categories)
  const refineFlags: string[] = [];
  let repairedEntry = entry;
  // ── WAVE I1 — THE 3D REFINEMENT MACHINE AUDIT (FIX PLAN §3/§10 — the
  //    deterministic P1-P8/C1-C6/T1-T8 mechanical card + the §10.4 verdict
  //    matrix). Runs on EVERY mirror when the cascade translation is threaded
  //    (ctx.translatedDays present — the report lane): the card rides the
  //    outcome (auditCard) for the MANUAL REVIEW STAGE (Wave K); the verdict
  //    routes the ACTIONS — REJECT_GENUINE → hard discard with the layer
  //    trail · RE_TRANSLATE → the re-translate loop (CHANGE 2: re-anchor at
  //    the structurally-equivalent zone, re-gate RRR ≥ floor) · RE_ADMIT /
  //    REFINE → fall through (the existing RRR < floor repair below handles
  //    REFINE; RE_ADMIT is a false-alarm rejection — the setup stands).
  //    Byte-identical when translatedDays is absent (the pre-Wave-I lanes —
  //    the golden diags measure that lane unchanged). ──
  const translatedForPair = ctx?.translatedDays
    ? (targetPair === 'EUR/USD' ? ctx.translatedDays.eu : ctx.translatedDays.gu)
    : undefined;
  let threeDCard: ThreeDAuditCard | null = null;
  let threeDZoneClass: ZoneClass | null = null;   // the re-anchored zone's class (RE_TRANSLATE)
  if (translatedForPair && translatedForPair.entries.length > 0) {
    const THREE_D_DAY_MS = 86_400_000;
    // The audit's day index = the SOURCE's BATTLE-day index (the day-native
    // attribution — the same doctrine as the tradeDay computation below:
    // "the Mon EU SHORT = Monday" — the SOURCE's signal day). NOT the
    // shapeDay's dayIdx: the shapeDay is resolved from the SOURCE ZONE's
    // formationMs in cascadeV45, which can land on a pre-week zone (the
    // Fri source's resolved OB zone formed Jun 18 → clamped dayIdx 0 → a
    // Friday mirror carrying a MONDAY shapeDay). The cascade translation
    // record for the setup's OWN day is the audit's Layer-2 substrate.
    const sourceBattleMs = !isMirrorOutcome(source) && typeof source.battleMs === 'number' && source.battleMs > 0
      ? source.battleMs
      : (isMirrorOutcome(source) && source.tradeMs > 0 ? source.tradeMs : 0);
    const dayIdx = sourceBattleMs > 0
      ? Math.max(0, Math.min(translatedForPair.entries.length - 1,
          Math.floor((sourceBattleMs - targetModel.anchor.weekStartMs) / THREE_D_DAY_MS)))
      : (ctx?.shapeDay?.dayIdx ?? 0);
    const probe = (() => {
      const p = weekProbeAtAnchor(anchor, direction, entry, targetModel.anchor, anchorConsumed, targetModel.lmv.table);
      return p ? { price: p.price, source: p.source } : null;
    })();
    const auditInput: ThreeDAuditInput = {
      setupId: sourceIdOf(source),
      pair: targetPair,
      lane: 'MIRROR',
      day: (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayIdx] ?? ctx?.shapeDay?.day ?? ''),
      dayIdx,
      direction,
      category,
      entry,
      sl: slFinal.sl,
      tp: tpResult.tp,
      rrr,
      categoryFloor: floor,
      pipValue,
      targetModel,
      shapeDay: ctx?.shapeDay,
      translatedDays: translatedForPair,
      sourceElement: zoneClassOf(source),
      sourceRole: srcDir === 'SHORT' ? 'SUPPLY' : srcDir === 'LONG' ? 'DEMAND' : null,
      translationMode: source.pair === 'DXY' ? 'INVERSE' : 'KEPT',
      anchor,
      anchorZoneId,
      tpRungId: tpResult.rungId,
      sourceFormationMs: ctx?.sourceFormationMs,
      session: null,
      rawRejectionReason: `RRR ${rrr.toFixed(2)} ${rrr < floor ? '<' : '≥'} ${floor.toFixed(1)} on ${targetPair} mirror of ${mirrorOf}`,
      probe,
    };
    threeDCard = auditSetup3D(auditInput);
    if (threeDCard.verdict === 'REJECT_GENUINE') {
      // The pipeline stage broke — the setup is NOT refinable at the setup
      // level; the full 3-layer audit trail IS the discard reason.
      return inert('RRR_DISCARDED',
        `${targetPair} mirror of ${mirrorOf}: ${threeDCard.refinementNote}`,
        { direction, entry, sl: slFinal.sl, tp: tpResult.tp, slMethod: slFinal.method, tpRungId: tpResult.rungId },
        anchorInfo, [...slV452Flags]);
    }
    if (threeDCard.verdict === 'RE_TRANSLATE') {
      // B1.5 (2026-08-01 — the E2-AUTHORITATIVE constraint): an anchor that
      // IS the E2-designated zone must NEVER be re-anchored by the RE_TRANSLATE
      // (the operator: "E2 DESIGNATES, E3 OBEYS" — the re-translate loop is for
      // the NO-E2-designation case, honest absence). The translation record may
      // disagree with the E2 CORE's designation — the E2 CORE wins. The setup
      // falls through to the RRR < floor REFINE path below (SL/TP repair ON the
      // E2 zone), or emits as-is when RRR >= floor.
      if (e2Designated) {
        refineFlags.push('E2_DESIGNATION_HELD: RE_TRANSLATE skipped — the anchor IS the E2-designated zone (E2 DESIGNATES, E3 OBEYS); SL/TP repair on the E2 zone only');
      } else {
        // CHANGE 2 — the RE_TRANSLATE loop: the cascade translation missed
        // (Layer 2 failed); re-translate (the structurally-equivalent zone —
        // the machine's C1-C4 primary matrix), re-anchor (E = the internal-LQZ
        // rung near edge; SL/TP per T3/T4), re-gate RRR ≥ floor. The corrected
        // setup emits with the '🔧 RE-TRANSLATED' annotation + the layer
        // evidence; a still-failing re-translation → HARD REJECT (the trail).
        // The ACTION fires on the INVERSE lane (DXY→EU) ONLY — the FIX PLAN's
        // §16.2 substrate (the BoM-wall structural twin). The KEPT lane
        // (EU→GU) records the verdict + the C-failures on the card and DEFERS
        // the re-anchor to the Wave-K review: the EU cascade's designations are
        // LQZ rungs without a GU BoM-wall substrate — a machine re-anchor there
        // drifts (measured: 1.33970 → 1.32822) and would massacre the healthy
        // GU lane. The audit still runs on EVERY lane (the card is the deliverable).
        if (source.pair !== 'DXY') {
          const cascadeBoxes = threeDCard!.layers.cascade as unknown as Record<string, AuditCheckResult | undefined>;
          const cFails = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']
            .filter((k) => cascadeBoxes[k]?.pass === false)
            .join(', ');
          refineFlags.push(`RE_TRANSLATE_DEFERRED: Layer 2 failed (${cFails}) — the KEPT lane's cascade designations lack a safe structural re-anchor substrate (the audit card rides the outcome; the Wave-K review judges)`);
        } else {
          const rt = retranslateSetup(auditInput);
          if (rt.setup && rt.setup.rrr >= floor - 1e-9) {
            const s = rt.setup;
            repairedEntry = s.entry;
            slFinal = { sl: s.sl, method: s.slMethod, rungId: slFinal.rungId, rxExt: slFinal.rxExt };
            tpResult = { tp: s.tp, rungId: s.tpRungId ?? tpResult.rungId };
            rrr = s.rrr;
            refineFlags.push(rt.annotation);
            threeDCard.correctedAnchors = { entry: s.entry, sl: s.sl, tp: s.tp, rrr: s.rrr };
            threeDCard.refinementNote = rt.annotation;
            // The re-anchor: the mirror's anchor is NOW the structurally-
            // equivalent zone (the re-translated designation — the dedup keys
            // the corrected zone, never the missed designation).
            if (rt.zone) {
              anchorInfo.anchorZoneId = rt.zone.id;
              anchorInfo.anchorKind = 'ORDER_BLOCK';
              anchorInfo.anchorFormationMs = rt.zone.formationMs;
              anchorInfo.anchorZfp = rt.zone.zfp;
              anchorInfo.anchorDefendedEdge = s.entry;
              threeDZoneClass = rt.zone.id.startsWith('LMV|') ? 'LQZ' : rt.zone.classification;
            }
          } else {
            return inert('RRR_DISCARDED',
              `${targetPair} mirror of ${mirrorOf}: ${rt.annotation}`,
              { direction, entry, sl: slFinal.sl, tp: tpResult.tp, slMethod: slFinal.method, tpRungId: tpResult.rungId },
              anchorInfo, [...slV452Flags]);
          }
        }
      }
    }
    // RE_ADMIT → the setup stands as-is (a false-positive rejection).
    // REFINE → the existing RRR < floor repair below (the analysis is
    // correct, the anchors are the refinement target — Layer 3 only).
  }
  // R2 (Phase 7): RRR-failed ≠ hard reject — the refinement machine repairs the
  // E/SL/TP on the SAME zone anchors (the operator: "Most of these 1.5-2 R trades
  // can easily be 3-4 R trades with properl E/SL/TP anchors on the exact same
  // zones that are already thethered to"). 3 attempts, then hard-reject with the
  // audit trail (D36). "A rejected setup is not a dead setup. The entry is the
  // hard-won insight; SL/TP are engineering." (ANCHOR_DOCTRINE.md:157)
  if (rrr < floor) {
    const refined = refineSetup({
      entry, sl: slFinal.sl, tp: tpResult.tp,
      direction, pair: targetPair, pipValue, categoryFloor: floor,
      targetModel, shapeDay: ctx?.shapeDay,
      anchor,
      entryZone: { defendedEdge: entry, floor: anchor.bottom, ceiling: anchor.top },
      slLmv: computeSL_LMV,
      probeAtAnchor: (a, e) => {
        const p = weekProbeAtAnchor(a, direction, e, targetModel.anchor, anchorConsumed, targetModel.lmv.table);
        return p ? { price: p.price, source: p.source } : null;
      },
    });
    if (refined.setup) {
      // Repaired — the mirror becomes ACTIVE with the repaired E/SL/TP; the
      // zone anchors NEVER change (only the placement on them).
      const s = refined.setup;
      repairedEntry = s.entry;
      slFinal = { sl: s.sl, method: s.slMethod, rungId: slFinal.rungId, rxExt: slFinal.rxExt };
      tpResult = { tp: s.tp, rungId: s.tpRungId ?? tpResult.rungId };
      rrr = s.rrr;
      refineFlags.push(refined.annotation);
      if (threeDCard) {
        threeDCard.correctedAnchors = { entry: s.entry, sl: s.sl, tp: s.tp, rrr: s.rrr };
        threeDCard.refinementNote = refined.annotation;
      }
    } else {
      // Hard-reject — the full 3-attempt audit trail IS the discard reason (D36).
      return inert('RRR_DISCARDED',
        `${targetPair} mirror of ${mirrorOf}: ${refined.annotation}`,
        { direction, entry, sl: slFinal.sl, tp: tpResult.tp, slMethod: slFinal.method, tpRungId: tpResult.rungId },
        anchorInfo);
    }
  }

  // ── The trade's day attribution (WAVE H1, G2 flag 3 — the operator's
  //    "the Mon EU SHORT = Monday"): the mirror's tradeDay/day label comes
  //    from the SOURCE setup's SIGNAL day — the shapeDay's day (the
  //    cascade's day: weekStart + dayIdx), or the source setup's battleMs
  //    day — when a shapeDay exists. The target-anchor reaction time is
  //    the FALLBACK ONLY (no shapeDay). Before this fix the tradeDay was
  //    the anchor's reaction time (the fresh LMV rungs formed June 18 →
  //    tradeDay 2026-06-18, PRE-WEEK) — the golden day labels were wrong
  //    AND the fill model bracketed the order to the pre-week day (misfire).
  //    The golden trades are day-attributed to the source's signal day. ──
  let tradeMs = 0;
  const DAY_MS = 86_400_000;
  if (ctx?.shapeDay) {
    const srcBattleMs = !isMirrorOutcome(source)
      && typeof source.battleMs === 'number' && source.battleMs > 0
      ? source.battleMs
      : 0;
    const carriedMs = isMirrorOutcome(source) && source.tradeMs > 0 ? source.tradeMs : 0;
    const dayIdx = typeof ctx.shapeDay.dayIdx === 'number' ? ctx.shapeDay.dayIdx : 0;
    const dayStartMs = targetModel.anchor.weekStartMs + dayIdx * DAY_MS;
    // The source's signal time first (the exact battle), then the carried
    // mirror day, then the shapeDay's day start — all land on the signal day.
    tradeMs = srcBattleMs > 0 ? srcBattleMs : carriedMs > 0 ? carriedMs : dayStartMs;
  } else if (anchorKind === 'LQZ') {
    const a = anchor as LqzZoneMatrix;
    if (a.candles.length > 0) tradeMs = a.candles[a.candles.length - 1]!.timestamp;
  } else {
    const a = anchor as ZoneModel;
    for (const ev of a.reactionEvents) if (ev.lastTouchMs > tradeMs) tradeMs = ev.lastTouchMs;
    if (tradeMs === 0) tradeMs = a.formationMs;
  }
  anchorInfo.tradeMs = tradeMs;
  anchorInfo.tradeDay = tradeMs > 0 ? dayKeyOfMs(tradeMs) : '';

  const flags: string[] = [...slV452Flags, ...refineFlags];   // R2: the 🔧 REPAIRED(n) annotation rides the flags (the outcome's notes)
  // v4.5.x R2 provenance: a consumed anchor is honest about its tier —
  // weakened but still reactive (battled within the week) or the
  // rank/nearest fallback, NEVER presented as an alive zone.
  if (anchorConsumed) {
    flags.push(`CONSUMED_ANCHOR: ${anchorZoneId} is DEPLETED — admitted via the recently-battled/rank-nearest fallback (v4.5.x R2), SL volatility-cleared`);
  }

  // ── THE CS-1 GUARD (§6.2 — MANDATORY): never emit a mirror whose SL the
  //    session-open price has already violated. Honest discard + reason.
  //    WAVE I1 (CHANGE 3, G2's flag 2): the CS-1 reference is DAY-NATIVE —
  //    when a shapeDay exists, the reference is the TRADE DAY's native open
  //    (the shapeDay's dayOpenSpot — the E1 DayBand forward-projected open;
  //    "spot price is practically irrelevant... it needs to be day native"),
  //    NOT the session open of the anchor's PRE-WEEK reaction time (fresh
  //    LMV rungs formed Jun 18 → a pre-week reference → Monday LONG mirrors
  //    whose SL sits above the pre-week session open are structurally
  //    rejected). Fallback to the existing behavior when no shapeDay exists
  //    (byte-identical). ──
  if (ctx?.sessionStartPrice && tradeMs > 0) {
    const dayNativeOpen = ctx?.shapeDay?.dayOpenSpot;
    const openPrice = dayNativeOpen !== undefined && dayNativeOpen > 0
      ? dayNativeOpen
      : ctx.sessionStartPrice(targetPair, tradeMs);
    if (openPrice !== null) {
      const cs1 = structurallyValid({ sl: slFinal.sl }, openPrice, direction);
      if (!cs1.valid) {
        return inert('CS1_INVALID',
          `${targetPair} mirror of ${mirrorOf}: ${cs1.reason} — declared invalid + discarded (§6.2, the EU #3/#4 killer)`,
          { direction, entry: repairedEntry, sl: slFinal.sl, tp: tpResult.tp, slMethod: slFinal.method, tpRungId: tpResult.rungId },
          anchorInfo, flags);
      }
      if (dayNativeOpen !== undefined && dayNativeOpen > 0) {
        flags.push(`CS1_DAY_NATIVE: reference = the trade day's open ${dayNativeOpen} (${ctx?.shapeDay?.day} dayOpenSpot — the day-native doctrine, CHANGE 3)`);
      }
    } else {
      flags.push('CS1_UNCHECKED: no 1H bar in the trade session — session-start price unknown (honest absence)');
    }
  } else {
    flags.push('CS1_UNCHECKED: no session-start price provider (guard unarmed — honest absence)');
  }

  // ── THE NARRATIVE-ALIGNMENT GATE (§7.2 — the counter-structure weight) ──
  if (ctx?.applyNarrativeGate !== false && anchorInfo.tradeDay !== '') {
    const gate = narrativeAligned(
      { direction, entry: repairedEntry, zfp: anchorZfp },
      targetModel.narrative,
      anchorInfo.tradeDay,
      { spot: targetModel.spot, atrPips: narrativeAtrPips(targetModel, pipValue), pipValue },
    );
    if (!gate.aligned) {
      return inert('NARRATIVE_SUPPRESSED',
        `${targetPair} mirror of ${mirrorOf}: ${gate.reason} — suppressed (§7.2)`,
        { direction, entry: repairedEntry, sl: slFinal.sl, tp: tpResult.tp, slMethod: slFinal.method, tpRungId: tpResult.rungId },
        anchorInfo, flags);
    }
    if (gate.flagged) flags.push(`COUNTER_STRUCTURE_FLAG: ${gate.reason}`);
  }

  return {
    sourceSetupId: sourceIdOf(source),
    anchorZoneId: anchorInfo.anchorZoneId,
    pair: targetPair,
    category,
    // B1.3: the E2 shapeDay's session (NY Overlap 08:00-10:00 ET for the EU Mon) — the fill model's bracket activates on the E2 session, NOT the source's battle session (TOKYO).
    session: e2Designated && ctx?.shapeDay?.session
      ? (ctx.shapeDay.session as SessionLabel)
      : (tradeMs > 0 ? sessionOf(tradeMs) : null),
    mirrorOf,
    direction,
    entry: repairedEntry,   // R2: the repaired entry (the micro-refined level); anchorDefendedEdge below stays the zone anchor
    sl: slFinal.sl,
    tp: tpResult.tp,
    rrr,
    status: 'ACTIVE',
    discardReason: undefined,
    slMethod: slFinal.method,
    tpRungId: tpResult.rungId,
    zoneClass: threeDZoneClass ?? zoneClass,   // Wave I1: the re-anchored zone's class (RE_TRANSLATE)
    anchorKind: anchorInfo.anchorKind,
    anchorFormationMs: anchorInfo.anchorFormationMs,
    anchorZfp: anchorInfo.anchorZfp,
    anchorDefendedEdge: anchorInfo.anchorDefendedEdge,
    anchorReactionExtreme: slFinal.rxExt,
    tradeMs,
    tradeDay: anchorInfo.tradeDay,
    flags,
    auditCard: threeDCard,   // Wave I1: the 3D audit card (the Wave-K review scaffolding)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE v4.5 CASCADE + THE §11 FLOOR (v4.5 casualty accounting)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// WAVE ZR-6D (2026-08-04) — THE D11 SIGNAL WINDOW (the distribution doctrine)
// ─────────────────────────────────────────────────────────────────────────────
//
// The operator's dedup doctrine (D11, VERBATIM): "multiple entries that are
// all within 5-15 or so pips of each other are multiple entries of 1 trade;
// a LL reinforcement 30+ pips away is obviously a separate trade." AND the
// distribution doctrine (VERBATIM): "Distribution must be a property of the
// SIGNALS (N distinct signals deserve N distinct zones), NEVER of the
// OUTCOMES." The ZR-6D distribution gate: the D11-window variants of a source
// zone are ONE signal and legitimately share the anchor; a source BEYOND the
// window is a DISTINCT signal and must spread. The E2 exact-match stays
// AUTHORITATIVE for the first signal ("E2 DESIGNATES, E3 OBEYS"); the
// distribution works AROUND it — it never overrides the designation.

/**
 * The D11 signal window = 15 pips, pair-scaled — the operator's "5-15 or so
 * pips" UPPER BOUND (the "or so" marks the band as the operator's language,
 * never a tunable). A constant FROM the quoted doctrine — never fitted to a
 * golden oracle. BECAUSE: the source-lane's dual-entry emission
 * (setup-gen.ts:1272 — `DUAL_ENTRY_MIN_SEPARATION_PIPS = 15`) already applies
 * the SAME 15-pip one-trade band — the cascade distribution mirrors the
 * source lane's doctrine on the mirror lane. The window is INCLUSIVE (≤ 15
 * pips = one signal; beyond = distinct) — the C1's "within the window may
 * share" and the distribution's "beyond the window must spread" are the exact
 * complements of one predicate.
 */
export const D11_SIGNAL_WINDOW_PIPS = 15;

/**
 * The source pair's pip from its price magnitude — the same pair-identity
 * heuristic the pool matcher uses (mirror.ts:1525: `targetSpot > 50 ? 0.01 :
 * 0.0001`). DXY ~100 → 0.01; the FX pairs ~1 → 0.0001. Deterministic — the
 * pip is a property of the pair, never a fitted value.
 */
function pipOfSourcePrice(price: number): number {
  return price > 50 ? 0.01 : 0.0001;
}

/**
 * srcZonePriceOf — the SOURCE ZONE's price parsed from a sourceSetupId. The
 * setup-gen id format (setup-gen.ts:1220/1322):
 *   `SRC-${pair}-${sanitizedZoneId}-${YYYYMMDD}-${SESSION}`
 *   e.g. `SRC-DXY-DXY_1H_1783386000000_100_803-20260707-TOKYO`
 * The zone price = the last two NUMERIC underscore segments before the
 * `-YYYYMMDD-SESSION` tail (`100` + `803` → 100.803 — the DXY 0.01 pip; the
 * FX form `1_14110` → 1.14110 — the 0.0001 pip). NaN when the id is not in
 * this shape — the `_EDGE<b>` dual-entry ids (setup-gen.ts:1322) are the
 * D11-DISTINCT cases by construction (emitted ONLY ≥ 15 pair-pips from the
 * defendedEdge, setup-gen.ts:1287) → NaN → beyond-window → spread. EXPORTED —
 * the C1 diag parses through the SAME code path (one doctrine, one parser).
 */
export function srcZonePriceOf(setupId: string): number {
  const tail = /-\d{8}-(TOKYO|LONDON|NY|OFF)$/.exec(setupId);
  if (!tail) return NaN;
  const core = setupId.slice(0, tail.index);
  const segs = core.split('_');
  if (segs.length < 2) return NaN;
  const int = segs[segs.length - 2]!;
  const frac = segs[segs.length - 1]!;
  if (!/^\d+$/.test(int) || !/^\d+$/.test(frac)) return NaN;
  const price = Number(`${int}.${frac}`);
  return Number.isFinite(price) ? price : NaN;
}

/**
 * d11DeltaPips — the pair-scaled pip distance between two source zones (the
 * D11 window's metric). NaN when either zone is unparseable (the `_EDGE`
 * ids). EXPORTED — the C1 diag prints the SAME metric the predicate gates on.
 */
export function d11DeltaPips(zoneA: number, zoneB: number): number {
  if (!Number.isFinite(zoneA) || !Number.isFinite(zoneB)) return NaN;
  return Math.abs(zoneA - zoneB) / pipOfSourcePrice(zoneA);
}

/**
 * isD11SameSignal — the D11 signal-identity predicate: two source zones are
 * the variants of ONE signal iff they fall within the D11 window (≤ 15 pips
 * pair-scaled — the inclusive boundary; a delta BEYOND the window is the
 * distinct-signal case). An unparseable zone (NaN) is NEVER verified as
 * same-signal → false (the `_EDGE` dual-entry ids are distinct by
 * construction). EXPORTED — the cascade distribution and the C1 diag share
 * ONE predicate (the assertion can never disagree with the mechanism).
 */
export function isD11SameSignal(zoneA: number, zoneB: number): boolean {
  if (!Number.isFinite(zoneA) || !Number.isFinite(zoneB)) return false;
  return d11DeltaPips(zoneA, zoneB) <= D11_SIGNAL_WINDOW_PIPS + 1e-9;
}

/**
 * cascadeV45 — DXY setups → EU re-anchored mirrors (inverse) → GU
 * re-anchored mirrors (kept). The v4.4 cascade() is preserved untouched;
 * this is the 80/20 lane (§5 Fix 3). One deviation from v4.4 by doctrine:
 * a source whose DXY zone cannot be resolved STILL mirrors — the 80%
 * signal (direction + class) is carried by the setup itself (its zoneType);
 * the formation-ms preference falls back to the setup's battle timestamp
 * (the shapeTrigger §8.4 identity). FAILED anchors (no pair-native zone of
 * the class) are logged, never invented (§9.2 rule 4).
 */
export function cascadeV45(
  dxySetups: TradeSetup[],
  models: { DXY: ChartModel; 'EUR/USD': ChartModel; 'GBP/USD': ChartModel },
  ctx?: Omit<MirrorReanchorContext, 'sourceFormationMs'>,
): MirrorCascadeResultV45 {
  const EU = 'EUR/USD';
  const GU = 'GBP/USD';
  const eu: MirrorOutcomeV45[] = [];
  const gu: MirrorOutcomeV45[] = [];
  const failedAnchors: FailedAnchor[] = [];

  // ── DXY → EU (inverse direction, pair-native anchor) ──
  // v4.5.x REFINEMENT 3 — the EU pool-widening distribution: the corrected
  // dedup collapses mirrors that share an anchor (same entry + day +
  // session by construction), so a subsequent DXY source mapping to an
  // ALREADY-USED anchor retries with the used anchors excluded — the
  // NEXT-strongest alive zone carries it. The strength-rank is preserved:
  // the strongest zone is always the first attempt; distribution fires
  // ONLY on a collision. Deterministic (insertion-ordered source loop).
  // Phase 6 P3.6 (deadlock fix, mirrors the GU loop's unconditional
  // usedGuAnchors.add at :2489): EVERY constructed mirror — ACTIVE or
  // discarded — registers its anchor. A mirror discarded at a zone (RRR /
  // CS-1 / narrative) still occupies the structure; registering it makes a
  // later source distribute to the next-strongest zone instead of
  // re-attempting the same dead-end geometry (the ×N-collapse killer).
  const usedEuAnchors = new Set<string>();
  for (const setup of dxySetups) {
    const dir = String(setup.direction);
    if (dir !== 'LONG' && dir !== 'SHORT') {
      failedAnchors.push({
        sourceId: setup.setupId, targetPair: EU,
        reason: `SOURCE_DIRECTION_${dir}: cannot mirror a directionless setup`,
      });
      continue;
    }
    const srcZone = resolveSourceZone(setup, models.DXY);
    const sourceFormationMs = srcZone?.formationMs ?? shapeTriggerMs(setup.shapeTrigger);
    // E2: resolve the day's shape from the cascaded chains. Phase 5 (E4):
    // the FULL ShapeDayZone is threaded (keyZoneId/keyZonePrice/supplyZoneId/
    // demandZoneId/dayOpenSpot — the chain days carry them from E1) →
    // reAnchorMirror → selectPairNativeZone (the E2 authoritative anchor) →
    // computeLmvTP (the E3 projected-opposing-zone TP).
    // B1.4 (2026-08-01): the mirror's day comes from the SOURCE SETUP's signal
    // day (battleMs — when the setup FORMED), NEVER the source zone's
    // formationMs (the DXY Mon source zone formed PRE-WEEK from the 720-bar
    // lookback → a negative index → clamped 0 by luck). The golden Mon trades
    // are Monday because the SOURCE is Monday.
    const srcSignalMs = typeof setup.battleMs === 'number' && setup.battleMs > 0
      ? setup.battleMs
      : sourceFormationMs;
    const euDayIdx = srcSignalMs > 0
      ? Math.floor((srcSignalMs - models.DXY.anchor.weekStartMs) / 86_400_000)
      : 0;
    const euShapeDay = ctx?.shapeChains?.eu?.days[
      Math.min(Math.max(0, euDayIdx), (ctx.shapeChains?.eu?.days?.length ?? 1) - 1)
    ];
    let m = reAnchorMirror(setup, models[EU], EU, { ...ctx, sourceFormationMs: srcSignalMs, shapeDay: euShapeDay });
    if (m && m.status === 'ACTIVE' && usedEuAnchors.has(m.anchorZoneId)) {
      // The distribution: the collision fires → the alt-retry with the
      // exclusion spreads the source to the next-distinct alive zone.
      // ORCHESTRATOR ADJUDICATION (2026-08-04): the ZR-6D D11 price-window
      // gate was REVERTED — it suppressed the alt-retry for the DISTINCT
      // trades within 15 pips (the operator's Wed #4/#5/#6 are distinct
      // trades at distinct zones — the per-zone direction) and regressed
      // the golden 10/21 → 9/21. The signal identity = the source ZONE
      // (the session variants of ONE zone share; the DISTINCT zones spread
      // via the alt — the ZR-4A semantics). The D11 "5-15 pips" applies to
      // the same-trade entry variants, never across the distinct zones.
      // ZR-6D (2026-08-04): the pool preference uses the SIGNAL time
      // (srcSignalMs — the battleMs) — the comment at :1579-1582 mandates
      // "Zones that reacted near the DXY SIGNAL time are the structural
      // equivalents" — the formation-based sourceFormationMs (weeks old)
      // emptied the timed pool and blocked the distribution (the Thu LONG
      // pile, C1-verified). The first call + the alt share the signal time.
      const alt = reAnchorMirror(setup, models[EU], EU, { ...ctx, sourceFormationMs: srcSignalMs, excludedAnchorIds: usedEuAnchors, shapeDay: euShapeDay });
      if (alt && alt.status === 'ACTIVE' && !usedEuAnchors.has(alt.anchorZoneId)) {
        m = alt; // distributed — the next-strongest alive zone carries it
      }
      // else: the strongest anchor stands (documented — distribution is
      // only preferred when the structure offers a distinct alive zone).
    }
    if (!m) {
      failedAnchors.push({
        sourceId: setup.setupId, targetPair: EU,
        reason: `NO_PAIR_NATIVE_ZONE: no alive ${zoneClassOf(setup)} ${dir === 'LONG' ? 'demand/BUY_SIDE' : 'supply/SELL_SIDE'} zone on ${EU} in its current storyline (§5.3 — honest, logged)`,
      });
      continue;
    }
    usedEuAnchors.add(m.anchorZoneId);
    eu.push(m);
  }

  // ── EU → GU (kept direction, pair-native anchor) — ACTIVE EU mirrors only ──
  // v4.5.2: GU distribution mechanism — spreads mirrors across DIFFERENT
  // zones instead of all piling on the strongest. Without this, 10+ GU
  // mirrors map to the same zone → only 1 unique trade after dedup.
  const usedGuAnchors = new Set<string>();
  for (const m of eu) {
    if (m.status !== 'ACTIVE') continue;
    // E2: resolve the GU day's shape from the cascaded chains. Phase 5 (E4):
    // the FULL GU ShapeDayZone is threaded (the GU chain's own zones) →
    // reAnchorMirror → selectPairNativeZone → computeLmvTP (E2/E3).
    const guDayIdx = m.tradeMs > 0
      ? Math.floor((m.tradeMs - models[EU].anchor.weekStartMs) / 86_400_000)
      : 0;
    const guShapeDay = ctx?.shapeChains?.gu?.days[
      Math.min(Math.max(0, guDayIdx), (ctx.shapeChains?.gu?.days?.length ?? 1) - 1)
    ];
    let g = reAnchorMirror(m, models[GU], GU, { ...ctx, sourceFormationMs: m.anchorFormationMs, shapeDay: guShapeDay });
    // DISTRIBUTION: if this zone is already used, retry with exclusion —
    // the ORCHESTRATOR ADJUDICATION (2026-08-04): the ZR-6D D11 price-window
    // gate REVERTED (the same doctrine as the EU lane — the signal identity
    // = the source ZONE; the distinct trades spread via the alt).
    if (g && usedGuAnchors.has(g.anchorZoneId)) {
      const alt = reAnchorMirror(m, models[GU], GU, { ...ctx, sourceFormationMs: m.anchorFormationMs, excludedAnchorIds: usedGuAnchors, shapeDay: guShapeDay });
      if (alt && !usedGuAnchors.has(alt.anchorZoneId)) {
        g = alt;
      }
    }
    if (!g) {
      failedAnchors.push({
        sourceId: m.sourceSetupId, targetPair: GU,
        reason: `NO_PAIR_NATIVE_ZONE: no alive ${m.zoneClass} ${m.direction === 'LONG' ? 'demand/BUY_SIDE' : 'supply/SELL_SIDE'} zone on ${GU} in its current storyline (§5.3 — honest, logged)`,
      });
      continue;
    }
    usedGuAnchors.add(g.anchorZoneId);
    gu.push(g);
  }

  const discarded = [...eu, ...gu].filter((m) => m.status !== 'ACTIVE');
  return { eu, gu, failedAnchors, discarded };
}

/**
 * checkMirrorFloorV45 — the §11 mirror-floor contract under the v4.5
 * casualty model. v4.5 ADDS documented casualty classes the v4.4 contract
 * predates: CS-1 invalids (§6.2), narrative suppressions (§7.2), and
 * pair-native RRR discards. The floor holds when EVERY EU/GU shortfall is
 * a failed anchor OR a reasoned discard (the temporal clause, unchanged:
 * G(discarded → ∃reason)).
 *
 *   INVARIANT 1: |EU.active| ≥ |DXY.active| − |EU.failedAnchors| − |EU.reasoned discards|
 *   INVARIANT 2: |GU.active| ≥ |EU.active| − |GU.failedAnchors| − |GU.reasoned discards|
 *   TEMPORAL:    every discarded mirror carries a discardReason.
 */
export function checkMirrorFloorV45(
  result: MirrorCascadeResultV45,
  dxyActiveCount: number,
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const euActive = result.eu.filter((m) => m.status === 'ACTIVE').length;
  const euFailed = result.failedAnchors.filter((f) => f.targetPair === 'EUR/USD').length;
  const euCasualties = result.eu.filter((m) => m.status !== 'ACTIVE' && !!m.discardReason).length;
  if (euActive < dxyActiveCount - euFailed - euCasualties) {
    violations.push(
      `CONTRACT mirror-floor-v45[EU]: |EU.active|=${euActive} < |DXY.active|=${dxyActiveCount} − |EU.failedAnchors|=${euFailed} − |EU.reasoned discards|=${euCasualties}` +
      ` — undocumented EU casualty (§11); evidence: eu=[${result.eu.map((m) => `${m.sourceSetupId}:${m.status}`).join(',')}]`,
    );
  }
  const guActive = result.gu.filter((m) => m.status === 'ACTIVE').length;
  const guFailed = result.failedAnchors.filter((f) => f.targetPair === 'GBP/USD').length;
  const guCasualties = result.gu.filter((m) => m.status !== 'ACTIVE' && !!m.discardReason).length;
  if (guActive < euActive - guFailed - guCasualties) {
    violations.push(
      `CONTRACT mirror-floor-v45[GU]: |GU.active|=${guActive} < |EU.active|=${euActive} − |GU.failedAnchors|=${guFailed} − |GU.reasoned discards|=${guCasualties}` +
      ` — undocumented GU casualty (§11); evidence: gu=[${result.gu.map((m) => `${m.sourceSetupId}:${m.status}`).join(',')}]`,
    );
  }
  for (const m of result.discarded) {
    if (!m.discardReason) {
      violations.push(
        `CONTRACT mirror-floor-v45[temporal]: discarded mirror ${m.pair}:${m.sourceSetupId} (${m.status}) has NO discardReason — G(discarded → ∃reason) violated (§11)`,
      );
    }
  }
  return { ok: violations.length === 0, violations };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4.2/§9 — THE PER-ANCHOR EMISSION CAP (the GU ×10 kill)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * mirrorToDedupSetupV452 — the §9.1 adapter: an ACTIVE mirror as the
 * dedup engine's DedupSetup (the cap + dedup consume this shape). The
 * identity anchor is the mirror's defendedEdge (§1.2: the LMV
 * defendedEdge, or the entry); the day is the trade's target-native ISO
 * day; triggerMs is the anchor's latest reaction (the leg-ordering key).
 */
export function mirrorToDedupSetupV452(m: MirrorOutcomeV45): DedupSetup {
  return {
    setupId: `MIRV45-${m.pair}-${m.sourceSetupId}`,
    pair: m.pair,
    direction: m.direction,
    entry: m.entry,
    sl: m.sl,
    tp: m.tp,
    day: m.tradeDay,
    session: m.session ?? undefined,
    triggerMs: m.tradeMs > 0 ? m.tradeMs : undefined,
    entryZone: { defendedEdge: m.anchorDefendedEdge },
  };
}
