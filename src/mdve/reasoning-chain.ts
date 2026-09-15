/**
 * REASONING CHAIN — the 11-token sequence engine.
 * (PLUTUS_V4.5.4_REASONING_CHAIN_L1_SPEC §5 — THE BUILD AUTHORITY — the
 *  deterministic 70% + the LLM 30% hooks; the operator's FORWARD-REASONING LAW:
 *  "THIS is the root cause of literally ALL fucked trades... the lack of forward
 *   looking reasoning and logic")
 *
 * THE 11-TOKEN SEQUENCE (the operator's golden-doc analyses as the baseline):
 *   1-7  DETERMINISTIC: zone-identification → pressure-status → liquidity →
 *        break-validation → strength-comparison → reaction-count → chain-progress
 *   8-11 LLM-HOOKED (the deterministic skeleton + the shadow-agent hook):
 *        forward-position → chaining → anchors → validation
 *
 * THE OUTPUT (the operator's §8.2 contract): the TradeProjection with the
 *   E/SL/TP as CHECKABLE numbers traceable to a specific E1 zone + the E2
 *   projection (the E3-NEVER rule). The E2 is validated/refined/retried
 *   BEFORE the E3 (the runRefineRetry loop, ≤3 refinements). The hard-throw
 *   happens ONLY after 3 failed refinements → the failure store.
 *
 * THE ENFORCEMENT LAW (verbatim): "a refine/retry is correct. not a hard throw.
 *   only hard throw SPECIFIC MICRO COMPONENTS after they have failed 3
 *   refinements and then full data needs to be stored in an internal SQLite db".
 *
 * THE DETERMINISM: tokens 1-7 are pure functions over the E1/E2 data (same
 *   bars → identical ledger). The LLM hook (tokens 8-11) is the ONLY
 *   nondeterminism — bounded, recorded as llmRefined per token, and NEVER able
 *   to hang the pipeline (the deterministic fallback + the confidence cap).
 */

import type { ChartModel, ZoneModel, WeeklyNarrative } from './types.js';
import type { LmvTable, LqzZoneMatrix } from './lmv.js';
import type { ScaffoldRung } from '../engines/ladder-scaffold.js';
import type { OHLCBar } from '../types.js';
import type { ShapeDayZone, CascadedShapeChain } from './shape-cascade.js';
import { computeMirrorSL, computeMirrorTP, computeLmvTP, computeLadderStepsSL, proxyAtr1hPips } from './mirror.js';
import type { ShadowAgentClient } from './shadow-agent.js';
import { validateAgentDecisions } from './shadow-agent.js';
import { recordFailure } from './failure-store.js';
import { getAnalysisPointMs } from './temporal.js';
// THE ADM IMPORT (the W-ADM-2 — the L2 spec §2.5.1): the deterministic E3
// anchor engine. The ADM imports OperativeZone + Direction from THIS module
// as TYPE-ONLY (no runtime cycle — the function-level import is one-directional:
// the chain calls anchorTrade, the ADM consumes the chain's types erased at
// compile time). The anchor construction (the SL/entry/TP) DELEGATES to the
// ADM's MEASURED placements — the fixed pip constants die at their sites.
import { anchorTrade, resolveSlDepth, resolveEntry, resolveTp, measureMinViableDefensePips, isDegeneratePair, type AdmInput } from './anchor-decision-machine.js';
// W6 (the §2.7.1 — the M-4 kill): THE PHANTOM-BoM ALL-4 SINGLE-SOURCE — the
// zone-classification lexicon's exported all-4 (the ONE implementation; the
// reasoning-chain's divergent re-implementation is REPLACED by the delegate
// below). The sub-predicates feed the verdict's criteria; the ratio/large-OB
// constants keep the evidence strings honest (never a re-derived magic number).
import {
  isPhantomBoM,
  predLargeOb,
  predMidSwingFakeout,
  predOpposingBoMReaction,
  predMacroOriginContinuation,
  LARGE_OB_RATIO,
} from './lexicons/zone-classification.js';
import type { LexiconData } from './lexicons/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// THE CONTRACT TYPES (the operator's §8.2 TradeProjection + the L1 §4/§5 types)
// ═══════════════════════════════════════════════════════════════════════════

export type PairKey = 'DXY' | 'EUR/USD' | 'GBP/USD';
export type Direction = 'LONG' | 'SHORT';
export type TimeframeKey = '1H' | '4H' | '30m' | '15m';

export const CLUSTER_TOLERANCE_PIPS = 2; // the L1 §4.1 entry tolerance
export const RRR_GATE = 2.5;             // the operator's obvious-trades RRR gate
export const MAX_REFINEMENTS = 3;        // the enforcement law — the hard-throw threshold
export const CONFIDENCE_DEGRADATION_CAP = 0.7; // the L1 §6.2 — no LLM → capped

export type TokenId =
  | 'zone-identification' | 'pressure-status' | 'liquidity'
  | 'break-validation' | 'strength-comparison' | 'reaction-count'
  | 'chain-progress' | 'forward-position' | 'chaining'
  | 'anchors' | 'validation';

export interface TokenResult {
  token: TokenId;
  deterministic: boolean;
  llmRefined?: boolean;
  verdict: string;
  evidence: string[];
  confidence?: number;
}

export interface RefinementWarning {
  check: string;        // 'DIRECTION_ORDER' | 'RRR_BELOW_GATE' | 'MACRO_DIVERGENCE' | 'ANCHOR_TRACE' | ...
  token: TokenId;
  sourceRef: string;    // the evidence (file:line / zone id / setup id — never narration)
  value: unknown;
  proposed: string;     // the correction, with the context
}

export interface ZoneVerdict {
  zoneId: string;
  classification: 'BoM' | 'MoM' | 'PHANTOM_BOM' | 'LQZ';
  deathRuleVerdict: 'CLEAR' | 'DEATH' | 'EXEMPT';
  confidence: number;
  evidence: string[];
}

export interface PressureRead {
  side: 'BUY' | 'SELL';
  lifecycle: string;
  score: number;
  mitigationCount: number;
  fortress: boolean;
  pierced: boolean;
}

export interface LiquidityRead {
  liquidityBelow: number;
  liquidityAbove: number;
  nearestLqz: string | null;
  nestedRungs: number;
  shieldRungs: number;
}

export interface ValidationSignal {
  breakVerdict: 'VALID' | 'INVALID' | 'UNBROKEN';
  closeBeyond: boolean;
  wickReclaim: boolean;
  narrativeRef: string | null;
}

export interface StrengthSignal {
  strongerSide: 'BUY' | 'SELL';
  delta: number;
  impulseRatio: number;
}

export interface ChainPosition {
  chainStage: string;
  chainDirection: Direction | null;
  chainProgress: number;
  daysRemaining: number;
}

export interface ProjectionAnchor {
  role: 'ENTRY' | 'SL' | 'TP';
  price: number;
  e1ZoneId: string;      // the E3-NEVER trace
  e2ProjectionId: string; // the E3-NEVER trace
  method: string;
  rungId?: string;
}

export interface ValidationOutput {
  valid: boolean;
  warnings: RefinementWarning[];
  confidence: number;
}
export type ValidationVerdict = ValidationOutput;

export interface TradeProjection {
  pair: PairKey;
  day: string;
  shape: string;
  direction: Direction;
  entryZoneId: string;
  entryLqzId?: string;
  E: number; SL: number; TP: number; RRR: number;   // the checkable anchors
  pressureRead: PressureRead;
  chainContext: string;
  validation: ValidationOutput;
  confidence: number;
  source: 'NATIVE' | 'CASCADE';
  e2ProjectionId: string;
  /** The E2 day's OWN designation direction (the divergence evidence). */
  e2DayDirection: Direction;
  setupId: string;
  anchors: ProjectionAnchor[];
  tokenLedger: TokenResult[];
}

export interface ChainContext {
  pair: PairKey;
  week: string;
  anchorMs: number;
  tokens: TokenResult[];
  macroDirection: Direction;
  macroConsistent: boolean;
  divergences: string[];
}

export interface ChainFailure {
  pipelineStage: 'E2' | 'E3' | 'SHADOW';
  failureType: 'REFINEMENT_EXHAUSTED' | 'CONTRACT_VIOLATION' | 'SHADOW_DEGRADE' | 'MACRO_DIVERGENCE';
  pair: PairKey;
  setupId: string;
  warnings: RefinementWarning[];
  projection: TradeProjection | null;
  nextSteps: string[];
}

/** The operative zone — the normalized E1 zone / LMV rung the chain reasons over. */
export interface OperativeZone {
  id: string;
  type: 'SUPPLY' | 'DEMAND';
  floor: number;
  ceiling: number;
  classification: 'BoM' | 'MoM' | 'LQZ';
  timeframe?: string;
  zfp: number;
  confluence: number;
  reactionCount: number;
  formationMs?: number;
  pressure?: import('./types.js').ZonePressureState;
  sourceZone?: ZoneModel;
  lqz?: LqzZoneMatrix;
  defendedEdge?: number;
  reactionExtreme?: number;
  /** The phantom-BoM exemption verdict (the type-2 virgin MoM = the fortress). */
  phantom?: boolean;
  /** The E1 freshness state (the FRESH/TESTED_x machine — the virgin truth). */
  freshness?: string;
}

export interface MacroAuthorityInput {
  direction: Direction;
  mirrorPair: PairKey | null;
  inverted: boolean;
  source: string;
}
export type MacroAuthority = Record<PairKey, MacroAuthorityInput>;

// ═══════════════════════════════════════════════════════════════════════════
// THE SHADOW-OP INPUTS (the L1 §5.3 skeletons the shadow agent consumes)
// ═══════════════════════════════════════════════════════════════════════════

export interface ForwardProjectionInput {
  pair: PairKey;
  tokenLedger: TokenResult[];
  operativeZone: OperativeZone;
  dayOpenSpot: number;
  continuationTargets: number[];
  macro: MacroAuthorityInput;
  widthRatio: number;
  bars: OHLCBar[];
  pip: number;
}
export interface ForwardProjectionOutput {
  forwardPosition: number;
  chosenTarget: number;
  positionVerdict: 'FORWARD' | 'NOT_FORWARD';
  reasonTrace: string[];
  llmRefined?: boolean;
}

export interface ChainingInput {
  pair: PairKey;
  direction: Direction;
  euCascaded?: unknown;
  guCascaded?: unknown;
  macro: MacroAuthorityInput;
}
export interface ChainingOutput {
  chainVerdict: boolean;
  linkedMirror: PairKey | null;
  divergence: string | null;
  llmRefined?: boolean;
}

export interface AnchorInput {
  pair: PairKey;
  direction: Direction;
  operativeZone: OperativeZone;
  tokenLedger: TokenResult[];
  e2ProjectionId: string;
  slCandidate: number | null;
  tpCandidate: number | null;
  atr1hPips: number;
  widthRatio: number;
  pip: number;
}
export interface AnchorOutput {
  entry: number;
  sl: number;
  tp: number;
  rrr: number;
  anchors: ProjectionAnchor[];
  entryRungId?: string;
  llmRefined?: boolean;
}

export interface ReasoningChainInput {
  pair: PairKey;
  week: string;
  anchorMs: number;
  model: ChartModel;
  lmvTable: LmvTable;
  e2: {
    dxyChain?: CascadedShapeChain | null;
    euCoreChain?: CascadedShapeChain | null;
    guCoreChain?: CascadedShapeChain | null;
    euCascaded?: unknown;
    guCascaded?: unknown;
  };
  /** The pair's OWN E2 day chain (euCoreChain for EU, guCoreChain for GU, dxyChain for DXY). */
  e2Days: CascadedShapeChain | null;
  dxySetups?: unknown[];
  cascade?: { eu: unknown[]; gu: unknown[] };
  barsByTf: Record<TimeframeKey, OHLCBar[]>;
  macro: MacroAuthorityInput;
  lexicons?: Record<string, unknown>;
  shadow?: ShadowAgentClient;
  pip: number;
  atr1hPips: number;
  /** The days to process (default ['Monday']). */
  days?: string[];
}

export interface ReasoningChainResult {
  projections: TradeProjection[];
  ledger: ChainContext;
  failures: ChainFailure[];
  stats: {
    deterministicTokens: number;
    llmTokens: number;
    refinements: number;
    hardThrows: number;
  };
}

/** The per-projection build context (the token-set the shadow reads). */
export interface TokenSetContext {
  input: ReasoningChainInput;
  e2Day: ShapeDayZone;
  operativeZone: OperativeZone;
  direction: Direction;
  dayIndex: number;
  dayKey: string;
  shape: string;
  dayOpenSpot: number;
  priorTp?: number;
  e2ChainDays: Array<{ day: string; shape: string; direction?: string; confidence?: number }>;
  widthRatio: number;
  /** Tokens 1-7 — the ledger the shadow reads (set before the token-8 call). */
  tokens: TokenResult[];
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ZONE RESOLUTION + THE SMC HELPERS (the E1 machine ids — the E3-NEVER
// traceability source)
// ═══════════════════════════════════════════════════════════════════════════

export function rungIdOf(pair: string, center: number): string {
  return `LMV|${pair}|${center.toFixed(5)}`;
}

export function zoneToOperative(z: ZoneModel): OperativeZone {
  return {
    id: z.id,
    type: z.type,
    floor: z.bottom,
    ceiling: z.top,
    classification: z.classification,
    timeframe: z.timeframe,
    zfp: z.zfp,
    confluence: z.confluence ?? 0,
    reactionCount: z.reactionEvents?.length ?? 0,
    formationMs: z.formationMs,
    pressure: z.pressure,
    sourceZone: z,
    freshness: z.freshness,
  };
}

export function rungToOperative(pair: string, r: LqzZoneMatrix): OperativeZone {
  return {
    id: rungIdOf(pair, r.center),
    type: r.side === 'SELL_SIDE' ? 'SUPPLY' : 'DEMAND',
    floor: r.bottom,
    ceiling: r.top,
    classification: 'LQZ',
    timeframe: r.timeframe,
    zfp: r.zfp,
    confluence: 0,
    reactionCount: r.candles?.length ?? 0,
    lqz: r,
    defendedEdge: r.defendedEdge,
    reactionExtreme: r.reactionExtreme,
  };
}

/** THE RUNG-VALIDITY GATE (the W6 §2.6 invariant — the chain's copy of the
 *  picker's isValidRung, D-1 2026-08-10): a liquidity rung is a BAND — a
 *  zero-width (collapsed) geometry or a band narrower than the 0.5-pip floor
 *  is a DEFECT, never a level. The id-center consistency (the W6's exact
 *  predicate: |idLevel - z.center| — the center FIELD is the id level by
 *  construction, so the WIDTH gate is the operative check here). The GU
 *  Monday's collapsed LMV|GBP/USD|1.33270 [1.33059-1.33059] (zero-width, 21p
 *  below its id) is the class this gate rejects. THE DETECTOR ONLY — the
 *  decision (which rung the chain reasons over) belongs to the resolution
 *  preference below, never to this predicate alone. */
export function isDegenerateRung(r: LqzZoneMatrix, pair: string): boolean {
  const pip = r.bottom > 5 ? 0.01 : 0.0001; // the DXY scale (~101) vs the FX scale (~1.14)
  const widthPips = (r.top - r.bottom) / pip;
  if (widthPips <= 0) return true;                 // the collapsed geometry dies
  if (widthPips < 0.5) return true;                // the 0.5-pip floor (the 0.5-pip pair survives)
  const idLevel = Number(String(rungIdOf(pair, r.center)).split('|')[2]);
  if (Number.isFinite(idLevel) && Math.abs(idLevel - r.center) > 2 * pip) return true;
  return false;
}

/** THE C-2 FIX (2026-08-11 — Machine C): strip the band suffix from a
 *  band-qualified LMV id (`LMV|pair|center|floor|ceiling` → `LMV|pair|center`).
 *  The E2's designation pins the EXACT telescoped tier with the suffix; the
 *  mirror/gate exact-string consumers match the UNQUALIFIED id — the strip
 *  keeps them working (the band-qualified id is a SUPERSET — the stripped
 *  id still matches the candidates). Absent the suffix → the id unchanged. */
export function stripBandSuffix(id: string): string {
  const parts = String(id).split('|');
  if (parts.length >= 5 && parts[0] === 'LMV') return parts.slice(0, 3).join('|');
  return String(id);
}

export function resolveOperativeZone(
  model: ChartModel,
  pair: string,
  id: string | null | undefined,
): OperativeZone | null {
  if (!id) return null;
  // THE C-2 FIX (2026-08-11 — Machine C): the band-qualified LMV id
  // (`LMV|pair|center|floor|ceiling` — the E2's designation pins the EXACT
  // telescoped tier; the unqualified `LMV|pair|center` is ambiguous when
  // multiple rungs share the center — the EU Monday's 1.14370 has THREE
  // rungs, and the plain `.find` returned the FIRST (the BUY_SIDE
  // [1.14305-1.14339]) instead of the E2's SELL_SIDE [1.1439-1.14415] → the
  // ADM's entry 1.14253 → RRR 1.73 → the REJECT). Parse the suffix and pin
  // the exact band; absent the suffix → the pre-C-2 first-match (backward
  // compatible — the legacy ids still resolve).
  let searchId = id;
  let bandFloor: number | null = null;
  let bandCeiling: number | null = null;
  const parts = String(id).split('|');
  if (parts.length >= 5 && parts[0] === 'LMV') {
    const f = Number(parts[parts.length - 2]);
    const c = Number(parts[parts.length - 1]);
    if (Number.isFinite(f) && Number.isFinite(c) && f > 0 && c > f) {
      searchId = parts.slice(0, 3).join('|');
      bandFloor = f;
      bandCeiling = c;
    }
  }
  if (bandFloor != null && bandCeiling != null) {
    const exact = model.zones.find((z) => z.id === searchId
      && Math.abs(z.bottom - bandFloor!) < 1e-9 && Math.abs(z.top - bandCeiling!) < 1e-9);
    if (exact) return zoneToOperative(exact);
  }
  const z = model.zones.find((z) => z.id === searchId);
  // THE G3 ZERO-WIDTH GUARD (W9 — the GU Monday LONG): the blind return below
  // returned the collapsed LMV|GBP/USD|1.33270 [1.33059-1.33059] BEFORE the
  // isDegenerateRung path — the ADM got a zero-risk band → RRR_BELOW_FLOOR →
  // NO LONG lane → G3 0 LONGs. A zero-width / sub-floor band is NEVER
  // operative — fall through to the lmv.table path (never return it).
  if (z) {
    const zpip = z.bottom > 5 ? 0.01 : 0.0001;
    const zwidthPips = (z.top - z.bottom) / zpip;
    if (Math.abs(z.top - z.bottom) < 1e-6 || zwidthPips < 0.5) {
      console.error(`[DBG-G3] degenerate zone ${searchId} pair ${pair} band [${z.bottom}-${z.top}] — fall through to lmv.table`);
    } else {
      return zoneToOperative(z);
    }
  }
  // The LMV bridge ids: `LMV|pair|center` (types.ts) + `LMV-center` (shape-cascade).
  const rung = model.lmv.table.find(
    (r) => rungIdOf(pair, r.center) === id || `LMV-${r.center.toFixed(5)}` === id,
  );
  if (rung) {
    // THE DEGENERATE-RUNG REJECTION (the D-1 fix — the W8B §7): a rung whose
    // band is degenerate (zero-width / id-center drift > 2p) is NEVER the
    // operative zone — the chain resolves the NEAREST VALID rung of the SAME
    // SIDE by the id-level distance (the GU Monday: the designated
    // LMV|GBP/USD|1.33370's band sits 11p below its id → the nearest valid =
    // the LMV|GBP/USD|1.33380 [1.33306-1.33343] — the golden-containing
    // band). No valid neighbor → the honest absence (null — the lane falls
    // to the next resolution; never a fabricated level).
    if (isDegenerateRung(rung, pair)) {
      // THE G3 GEOMETRY-AWARE RUNG PICK (W9): the id-distance sort picked the
      // nearest id (the GU Monday's 1.33280, 1p away) over the golden band.
      // Prefer the same-side valid band CONTAINING model.spot (the
      // Monday-open proxy — the golden 1.33380 [1.33306-1.33343] contains the
      // open 1.33342), else the nearest by band-center distance to spot.
      const spot = model.spot;
      console.error(`[DBG-D1] degenerate rung ${id} pair ${pair} band [${rung.bottom}-${rung.top}] center ${rung.center} side ${rung.side} spot ${spot}`);
      const pool = model.lmv.table.filter((r2) => r2.side === rung.side && !isDegenerateRung(r2, pair));
      if (Number.isFinite(spot) && spot > 0) {
        const containing = pool
          .filter((r2) => r2.bottom <= spot + 1e-9 && r2.top >= spot - 1e-9)
          .sort((a, b) => ((a.top - a.bottom) - (b.top - b.bottom)) || (Math.abs((a.top + a.bottom) / 2 - spot) - Math.abs((b.top + b.bottom) / 2 - spot)));
        if (containing[0]) {
          console.error(`[DBG-G3] containing pick ${rungIdOf(pair, containing[0]!.center)} [${containing[0]!.bottom}-${containing[0]!.top}] for ${id}`);
          return rungToOperative(pair, containing[0]!);
        }
        const nearest = [...pool].sort((a, b) => Math.abs((a.top + a.bottom) / 2 - spot) - Math.abs((b.top + b.bottom) / 2 - spot))[0];
        if (nearest) {
          console.error(`[DBG-G3] nearest-center pick ${rungIdOf(pair, nearest.center)} [${nearest.bottom}-${nearest.top}] for ${id}`);
          return rungToOperative(pair, nearest);
        }
        return null;
      }
      const idLevel = Number(String(id).split('|')[2]);
      const nearest = pool
        .sort((a, b) => {
          const da = Math.abs(Number(String(rungIdOf(pair, a.center)).split('|')[2]) - idLevel);
          const db = Math.abs(Number(String(rungIdOf(pair, b.center)).split('|')[2]) - idLevel);
          return da - db;
        })[0];
      if (nearest) return rungToOperative(pair, nearest);
      return null;
    }
    return rungToOperative(pair, rung);
  }
  return null;
}

/** The zone's own near edge: the internal (nested) LQZ rung's edge, else the zone edge. */
export function internalNearEdge(zone: OperativeZone, lmvTable: LmvTable, side: 'SUPPLY' | 'DEMAND'): number {
  // THE OPERATOR'S ENTRY ANCHOR (the E1_E2_E3_MACRO §5.2): the entry = the
  // entry LQZ's NEAR EDGE — the FIRST CONTACT. For a SUPPLY trade the entry
  // LQZ is the SHIELD BENEATH the supply zone (the operator's EU #1: "LQZ at
  // 1.1444-1.14395 ~ using this as the entry zone anchor" — E 1.14395 = the
  // rung's near edge from below, the first contact for the SHORT); for a
  // DEMAND trade the shield sits ABOVE the demand zone (the operator's EU #2:
  // "the nested liquidity zone that sits inside this demand at 1.14110-1.14020"
  // — E 1.14110 = the near edge from above). The approach-side rung is found
  // FIRST (the shield); the zone-internal strongest rung is the FALLBACK.
  // The pip scale is derived from the zone's own price magnitude (the FX vs
  // the DXY scale) — never a fixed constant.
  const pip = (zone.ceiling - zone.floor) > 1 ? 0.01 : 0.0001;
  if (side === 'SUPPLY') {
    // (1) THE FLOOR-SIDE SHIELD (the operator's EU #1 — "LQZ shield beneath
    //     this supply zone and this supply zone as SL anchor"): the SELL_SIDE
    //     rung straddling/sitting BENEATH the zone's floor → the entry = its
    //     bottom (the near edge from below — the first contact the sweep's
    //     reaction hits). The EU Monday: the shield [1.1439-1.14415] beneath
    //     the supply [1.1446-1.14571] → E 1.14390 (Δ0.5p).
    const straddling = lmvTable
      .filter((r) => r.side === 'SELL_SIDE' && r.bottom <= zone.floor + 3 * pip && r.top >= zone.floor - 20 * pip)
      .sort((a, b) => (b.top - a.top) || (a.zfp - b.zfp))[0];
    if (straddling) return straddling.bottom; // the near edge from below
    // (2) THE ACTIVE-EDGE SHIELD (the D-2 fix — the W8B §7): when NO floor-side
    //     shield exists, the SELL_SIDE rung at the zone's CEILING (the active
    //     edge — the last defense before the zone is pierced upward) is the
    //     first-contact structure → the entry = its bottom (the near edge from
    //     below). The DXY Monday: the shield rung [101.12-101.154] overlaps
    //     the supply [101.027-101.153]'s ceiling → E 101.12 (Δ2.0p — the
    //     golden 101.140's band) — the deep-internal [101.071-101.076] rung is
    //     NEVER the entry (the I-5 shield doctrine — the raw zone edge / the
    //     deepest-internal-rung are the LAST resorts).
    const ceilingShield = lmvTable
      .filter((r) => r.side === 'SELL_SIDE' && r.top >= zone.ceiling - 3 * pip && r.bottom <= zone.ceiling + 20 * pip)
      .sort((a, b) => (b.top - a.top) || (a.zfp - b.zfp))[0];
    if (ceilingShield) return ceilingShield.bottom;
    const inside = lmvTable.filter((r) => r.side === 'SELL_SIDE' && r.bottom >= zone.floor && r.top <= zone.ceiling);
    if (inside.length === 0) return zone.floor;
    const strongest = [...inside].sort((a, b) => a.zfp - b.zfp)[0] as LqzZoneMatrix;
    return strongest.bottom;
  }
  // DEMAND — the entry = the NESTED liquidity's near edge from above (the
  // operator's EU #2: "the nested liquidity zone that sits inside this demand
  // at 1.14110-1.14020" — the entry E 1.14110 = the internal LQZ rung's top,
  // the first contact when price falls into the demand). The highest-top
  // internal rung wins (the first contact); the straddling-above rung is the
  // FALLBACK (the price falls THROUGH it to the demand).
  const demandInternals = lmvTable
    .filter((r) => r.side === 'BUY_SIDE' && r.bottom >= zone.floor && r.top <= zone.ceiling)
    .sort((a, b) => (b.top - a.top) || (a.zfp - b.zfp));
  if (demandInternals.length > 0) return demandInternals[0]!.top;
  const straddling = lmvTable
    .filter((r) => r.side === 'BUY_SIDE' && r.top >= zone.ceiling - 3 * pip && r.bottom <= zone.ceiling + 20 * pip)
    .sort((a, b) => (a.bottom - b.bottom) || (a.zfp - b.zfp))[0];
  if (straddling) return straddling.top; // the near edge from above
  return zone.ceiling;
}

/** The KCE-Telescoping continuation targets (the closed target set — never
 *  extended by the LLM): the opposing structures' near edges beyond the zone. */
export function continuationTargetsFor(
  model: ChartModel,
  zone: OperativeZone,
  direction: Direction,
): number[] {
  const set = new Set<number>();
  for (const z of model.zones) {
    if (direction === 'LONG' && z.type === 'SUPPLY' && z.bottom > zone.ceiling) set.add(z.bottom);
    if (direction === 'SHORT' && z.type === 'DEMAND' && z.top < zone.floor) set.add(z.top);
  }
  for (const r of model.ladder as ScaffoldRung[]) {
    if (direction === 'LONG' && r.bottom > zone.ceiling) set.add(r.bottom);
    if (direction === 'SHORT' && r.top < zone.floor) set.add(r.top);
  }
  const arr = [...set].sort((a, b) => (direction === 'LONG' ? a - b : b - a));
  return arr.slice(0, 5);
}

/**
 * THE OPERATOR'S CLOSEST-EDGE CAP (the E1_E2_E3_MACRO §5.4 — the TP edge
 * doctrine): the TP stops at the FIRST opposing S/D zone with an internal
 * LQZ rung at a MEANINGFUL distance (the Earth+Fire — the liquidity within
 * the pressure zone). For a SHORT the opposing zones are the DEMAND zones
 * below the entry; for a LONG the SUPPLY zones above. The scan walks the
 * opposing S/D zones nearest-first; the first zone whose band contains an
 * internal LQZ rung AND whose near edge is ≥ 2× the risk from the entry
 * caps the TP at that rung's NEAR edge (the close edge for the strong zone).
 * This EXTENDS past a degenerate E2 designation (e.g., the EU Monday's
 * demandZoneId = 1.14370 — a rung right below the entry — to the operator's
 * structural demand [1.14149-1.14000]'s internal LQZ at 1.14110). Returns
 * null when no qualifying zone exists.
 */
function capTpAtNearestOpposingSd(
  entry: number,
  sl: number,
  direction: 'LONG' | 'SHORT',
  model: ChartModel,
  pipValue: number,
): { tp: number; rungId: string } | null {
  const riskPips = Math.abs(entry - sl) / pipValue;
  const minTpPips = Math.max(2 * riskPips, 4); // ≥ 2× the risk, ≥ 4 pips
  const opposingZones = model.zones
    .filter((z) =>
      direction === 'SHORT'
        ? z.type === 'DEMAND' && z.top < entry - minTpPips * pipValue
        : z.type === 'SUPPLY' && z.bottom > entry + minTpPips * pipValue,
    )
    .sort((a, b) =>
      direction === 'SHORT' ? b.top - a.top : a.bottom - b.bottom);
  for (const z of opposingZones) {
    // the zone's internal LQZ rungs (the Earth within the Fire)
    const internals = model.lmv.table
      .filter((r) =>
        r.bottom >= z.bottom && r.top <= z.top &&
        (direction === 'SHORT' ? r.side === 'BUY_SIDE' : r.side === 'SELL_SIDE'))
      .sort((a, b) =>
        direction === 'SHORT' ? b.top - a.top : a.bottom - b.bottom);
    if (internals.length === 0) continue; // a bare zone — not the Earth+Fire
    // the NEAR edge (the SHORT's demand near edge = the rung's top — the
    // first contact from above; the LONG's supply near edge = the rung's
    // bottom — the first contact from below)
    const near = direction === 'SHORT' ? internals[0]!.top : internals[0]!.bottom;
    if (direction === 'SHORT' ? near < entry - minTpPips * pipValue : near > entry + minTpPips * pipValue) {
      return { tp: near, rungId: `${model.pair}|LMV|${near.toFixed(5)}` };
    }
  }
  return null;
}

/**
 * THE PHANTOM-BoM EXEMPTION (the operator's type-2 virgin MoM = the fortress).
 * THE W6 SINGLE-SOURCE (the §2.7.1 — the M-4 kill): the divergent re-implementation
 * is REPLACED by a thin DELEGATE to the zone-classification lexicon's exported
 * all-4 (isPhantomBoM — zone-classification.ts:369). The verdict is IDENTICAL to
 * the lexicon's by construction — a zone can no longer be exempted by one
 * implementation and rejected by the other (the register's M-4 verdict). The
 * mid-position requirement (mid ∈ (0,0.9)) is the lexicon's KEPT definition;
 * the proximity (the opposing-proximity ratio — 3.0 × the ATR proxy, the §2.7.3
 * M-3 kill) and the width (the large-OB ratio — 1.5 × the ATR proxy) are the
 * SMC-ratio doctrines — never the fixed 60-pip window, never a fixed pip number.
 */
export interface PhantomBomVerdict {
  exempt: boolean;
  criteria: { largeOb: boolean; midSwingFakeout: boolean; opposingBoMReaction: boolean; macroOriginContinuation: boolean };
  evidence: string[];
}

export function phantomBoMExemption(
  zone: OperativeZone,
  model: ChartModel,
  pip: number,
  atr1hPips: number,
): PhantomBomVerdict {
  // THE DELEGATE'S LexiconData — built from the OperativeZone + the model (the
  // same construction the W5 shape-brain adapter uses — ONE data mapping):
  //   floor/ceiling → the width data · the midSwingPosition from the zone's
  //   position in its leg (the model's observed range — the interior position
  //   the macro-origin continuation guarantees) · the opposing zones from
  //   model.zones (the pre-formation scan) · the formationMs · the macro-origin
  //   (the telescoping parent / the same-type 4H containment).
  const rangeLow = model.zones.length > 0 ? Math.min(...model.zones.map((z) => z.bottom)) : Infinity;
  const rangeHigh = model.zones.length > 0 ? Math.max(...model.zones.map((z) => z.top)) : -Infinity;
  const midSwingPosition =
    rangeHigh > rangeLow && isFinite(rangeLow) && isFinite(rangeHigh)
      ? (zone.ceiling - rangeLow) / (rangeHigh - rangeLow)
      : undefined; // the honest absence (a degenerate flat range) → the predicate fails
  const d: LexiconData = {
    zoneId: zone.id,
    zoneType: zone.type,
    zoneFloor: zone.floor,
    zoneCeiling: zone.ceiling,
    zoneTimeframe: zone.timeframe as LexiconData['zoneTimeframe'],
    zoneClassification: zone.classification,
    zoneFormationMs: zone.formationMs,
    zoneZfp: zone.zfp,
    zoneConfluence: zone.confluence,
    reactionCount: zone.reactionCount,
    freshness: zone.freshness as LexiconData['freshness'],
    midSwingPosition,
    pipValue: pip,
    atrPips: atr1hPips,
    parentZoneId: zone.sourceZone?.parent?.id,
    nestedWithin: !!zone.sourceZone?.nestedWithin,
    zones: model.zones.map((z) => ({
      type: z.type, classification: z.classification,
      formationMs: z.formationMs, top: z.top, bottom: z.bottom, timeframe: z.timeframe,
    })),
  };
  const exempt = isPhantomBoM(d);
  const criteria = {
    largeOb: predLargeOb(d),
    midSwingFakeout: predMidSwingFakeout(d),
    opposingBoMReaction: predOpposingBoMReaction(d),
    macroOriginContinuation: predMacroOriginContinuation(d),
  };
  const widthPips = (zone.ceiling - zone.floor) / pip;
  return {
    exempt,
    criteria,
    evidence: [
      `large-OB: ${criteria.largeOb} (width ${widthPips.toFixed(1)}p >= ${(LARGE_OB_RATIO * atr1hPips).toFixed(1)}p)`,
      `mid-swing fakeout: ${criteria.midSwingFakeout} (freshness ${zone.freshness ?? 'n/a'}, reaction ${zone.reactionCount}, mid ${midSwingPosition !== undefined ? midSwingPosition.toFixed(2) : 'n/a'})`,
      `pre-formation opposing-BoM reaction: ${criteria.opposingBoMReaction}`,
      `macro-origin continuation: ${criteria.macroOriginContinuation}`,
    ],
  };
}

function zonePressureScore(z: OperativeZone): number {
  const lifecycle = z.pressure?.lifecycle ??
    (z.reactionCount === 0 ? 'VIRGIN' : z.reactionCount >= 3 ? 'DEPLETED' : z.reactionCount === 1 ? 'ACTIVE_1' : 'ACTIVE_2');
  const lc = lifecycle === 'VIRGIN' ? (z.classification === 'BoM' ? 40 : 20)
    : lifecycle === 'FORTRESS' ? 45
    : lifecycle === 'ACTIVE_1' ? 10
    : lifecycle === 'ACTIVE_2' ? 0
    : lifecycle === 'DEPLETED' ? -30
    : lifecycle === 'BROKEN' ? -50
    : 0;
  return lc + (100 - z.zfp) / 10 + (z.confluence ?? 0) * 2;
}

/** The phantom-BoM fortress demand below the day open (the operator's
 *  [1.14145-1.14000] demand target) — the exemption's all-4 predicate. */
function findFortressDemand(
  model: ChartModel,
  dayOpenSpot: number,
  input: ReasoningChainInput,
): OperativeZone | null {
  const atr = input.atr1hPips;
  const exempted = model.zones
    // THE INJECTED-ZONE EXCLUSION (the D-1 fix — the W8B §7): the cascade
    // bridge injects synthetic S/D zones with LMV ids (the GU Monday's
    // LMV|GBP/USD|1.33370 [1.33248-1.33263] — a band 11p below its id level).
    // The phantom-BoM FORTRESS is the pair's OWN structure (the operator's
    // EU [1.14149-1.14000]) — the bridge's synthetic zones are NEVER the
    // fortress — the chain's longDemand must land on the real demand (the
    // GU's golden-containing LMV|GBP/USD|1.33380 [1.33306-1.33343]).
    .filter((z) => !String(z.id).startsWith('LMV|'))
    .filter((z) => z.type === 'DEMAND' && z.top <= dayOpenSpot)
    .map((z) => zoneToOperative(z))
    .map((z) => ({ z, ph: phantomBoMExemption(z, model, input.pip, atr) }))
    .filter((x) => x.ph.exempt)
    .sort((a, b) => b.z.ceiling - a.z.ceiling); // the NEAREST below the open first
  if (exempted.length === 0) return null;
  return { ...exempted[0]!.z, phantom: true };
}

/** The nearest DEMAND structure at/below the day open — the union pool (the
 *  S/D DEMAND zones + the VALID BUY_SIDE LMV rungs — the W6 width gate rejects
 *  the collapsed geometries), ranked by the band's CEILING DESC (the nearest
 *  to the open in the PRICE SPACE first). THE D-3a fix (the W8B §7): the
 *  chain's demand fallback must see the rungs — the GU Monday's golden-
 *  containing LMV|GBP/USD|1.33380 [1.33306-1.33343] (ceiling 1.33343) outranks
 *  the bridge-injected degenerate zone LMV|GBP/USD|1.33370 [1.33248-1.33263]
 *  (ceiling 1.33263 — 11p below its id). THE BAND-CROSSING FILTER: the
 *  demand's band must be AT/BELOW the open (the rung [1.33306-1.33343] SPANS
 *  the open 1.33342 — its top 1.33343 sits 0.1p ABOVE it — a strict
 *  top<=open filter excludes the golden band by a hair). The price reality
 *  ranks; the id claims never. */
function nearestDemandBelow(model: ChartModel, dayOpenSpot: number): OperativeZone | null {
  const zones = model.zones
    .filter((z) => z.type === 'DEMAND' && z.bottom <= dayOpenSpot)
    .map((z) => ({ zone: zoneToOperative(z), ceiling: z.top }));
  const rungs = model.lmv.table
    .filter((r) => r.side === 'BUY_SIDE' && r.bottom <= dayOpenSpot && !isDegenerateRung(r, model.pair))
    .map((r) => ({ zone: rungToOperative(model.pair, r), ceiling: r.top }));
  // THE C-3B REWRITE (2026-08-11 — Machine C, the zone-anchor law — SITE-8):
  // the demand fallback ranks by the E1 MPSE STRUCTURAL outputs — the
  // pressure DESC (the fortress +20 / the VIRGIN-BoM +40 — the operator's
  // LONG structures), then the zfp ASC — the CEILING POSITION (the price
  // distance) demoted to the FINAL tie-break. The operator: "NOTHING SHOULD
  // BE PRICE ANCHORED EVER" — the structural demand (the fortress 1.14004,
  // the BoM 1.13885) wins over a nearer sliver. The `bottom <= open` filter
  // stays as the VALIDITY gate.
  const pool = [...zones, ...rungs].sort((a, b) =>
    (zonePressureScore(b.zone) - zonePressureScore(a.zone)) ||
    ((a.zone.zfp ?? 99) - (b.zone.zfp ?? 99)) ||
    (b.ceiling - a.ceiling)); // the final tie-break: the nearest ceiling
  return pool[0]?.zone ?? null;
}

/** THE RECEIVING-DEMAND RESOLUTION (the DEFECT-N fix — 2026-08-11, the DXY
 *  LONG lane emission): the operator's chaining law VERBATIM — "the operator's
 *  chaining levels ALWAYS land INSIDE the receiving structure" — the LONG
 *  lane's operative demand must CONTAIN the chained entry (the prior lane's
 *  TP, Law 27). When the selected demand's band does NOT contain the chained
 *  TP (the DXY Monday: the E2 demand [101.005-101.045] vs the SHORT's TP
 *  100.918 — the TP falls BELOW the demand, so the chained-interior snap lands
 *  on the demand's own midpoint 101.025, Δ8.0p off the golden 100.945 — a
 *  MISS that ALSO loses on the real bars), the receiving structure is the E1
 *  DEMAND whose band CONTAINS the chained TP — the DXY's [100.86-100.94]
 *  (DXY|1H|1782108000000|100.860): the chained clamp 100.918 lands Δ2.7p from
 *  the operator's golden 100.945 (the W8B-precedented receiving band). THE
 *  NARROWEST containing DEMAND wins (the tightest structural wrapper — the
 *  same nearest-smallest doctrine as the ADM's containingStructuralZone): the
 *  DXY's [100.86-100.94] (8p) over the spanning [100.816-101.056] (24p) and
 *  the [100.841-100.946] (10.5p). THE E1 DEMAND ZONES ONLY (the operator's
 *  receiving structure is the structural demand — the W8B precedent resolves
 *  the DEMAND, never a synthetic LMV rung). The EU LONG is untouched by the
 *  gate: the fortress [1.14004-1.14147] ALREADY contains the chained 1.14040
 *  — the containment gate never fires there. Null → no demand contains the
 *  chained TP → the caller keeps the original selection (the honest absence —
 *  the D3 law, never a fabricated structure). */
export function receivingDemandForChained(model: ChartModel, chainedEntry: number): OperativeZone | null {
  if (!(chainedEntry > 0) || !Number.isFinite(chainedEntry)) return null;
  const containing = model.zones
    .filter((z) =>
      z.type === 'DEMAND' &&
      // THE BRIDGE-ZONE EXCLUSION (the DEFECT-N fix — the W8B precedent): the
      // cascade bridge injects synthetic LMV-id DEMAND zones (the DXY's
      // LMV|DXY|100.86000 [100.885-100.918] — a 3.3p rung with ZERO reaction
      // history, its SL measurement falls to the 2.5p min-viable floor → the
      // SL 100.893, hit by the 18:00 real-bar low 100.838 — the LOSS). The
      // operator's receiving structure is the STRUCTURAL demand (the W8B's
      // [100.86-100.94] DXY|1H|1782108000000|100.860) — never the bridge's
      // synthetic band.
      !String(z.id).startsWith('LMV|') &&
      z.bottom <= chainedEntry + 1e-9 &&
      z.top >= chainedEntry - 1e-9,
    )
    .sort((a, b) => (a.top - a.bottom) - (b.top - b.bottom)); // the narrowest first
  if (containing.length === 0) return null;
  return zoneToOperative(containing[0]!);
}

/** The SS-day's SUPPLY selection (the D-3a fix — the W8B §7): the union pool
 *  (the SUPPLY S/D zones + the SELL_SIDE rungs within the day's structural
 *  band — the open → the day's highest supply top), ranked by (1) the
 *  FORMATION RECENCY (the operator's recency law — "within 3 trading days up
 *  to the present moment": the EU Monday's #1 = the FRIDAY-FORMED 1.14460
 *  [Jul 3] — the Jun 22-era 1.14503 fortress is the MACRO context, never the
 *  operative), (2) the RECENTLY-BATTLED predicate (a zone with a reaction
 *  event within the recency window — the price has RECENTLY reacted there),
 *  (3) the E1 pressure DESC (the C-4 — the fresh 1x-22 over the depleted
 *  zfp-70), (4) the zfp ASC, (5) the position. The blanket-nearest was the
 *  derailment: the EU's minor 1.14245 (1.5p above the open) outranked the
 *  operator's structural 1.14460 (23p above). */
function strongestSupplyInDayBand(
  model: ChartModel,
  dayOpenSpot: number,
  _analysisPointMs: number,
): OperativeZone | null {
  // THE TEMPORAL LOCK (the G8/A3 fix — 2026-08-10): the recency window is
  // anchored to the LOCKED analysis point (the temporal engine's one-way
  // lock — 1783317600000), NEVER the run's limitMs — the negative control (a
  // later anchor) must NOT widen the window and flip the selection (the
  // control run's EU SHORT flipped to the Jun-22 fortress when the window
  // reached July 25 — a forward-looking leak). The lock is mandatory: a
  // chain run without the temporal lock throws (the W1's temporal law).
  const analysisPointMs = getAnalysisPointMs();
  const recencyWindowMs = analysisPointMs - 3 * 86400000; // the 3-trading-day recency (the M-9 window)
  const recentlyFormed = (z: OperativeZone): number =>
    z.formationMs !== undefined && z.formationMs >= recencyWindowMs ? 1 : 0;
  const recentlyBattled = (z: OperativeZone): number =>
    z.sourceZone?.reactionEvents?.some((ev) => ev.lastTouchMs >= recencyWindowMs) ? 1 : 0;
  const supplyZones = model.zones.filter((z) => z.type === 'SUPPLY' && z.bottom >= dayOpenSpot);
  const dayReachHigh = Math.max(
    dayOpenSpot,
    ...supplyZones.map((z) => z.top),
    ...model.lmv.table.filter((r) => r.side === 'SELL_SIDE' && r.bottom >= dayOpenSpot).map((r) => r.top),
  );
  const zones = supplyZones
    .filter((z) => z.bottom <= dayReachHigh)
    .map((z) => zoneToOperative(z));
  const rungs = model.lmv.table
    .filter((r) => r.side === 'SELL_SIDE' && r.bottom >= dayOpenSpot && r.bottom <= dayReachHigh && !isDegenerateRung(r, model.pair))
    .map((r) => rungToOperative(model.pair, r));
  const pool = [...zones, ...rungs];
  if (pool.length === 0) return null;
  return pool.sort((a, b) =>
    (recentlyFormed(b) - recentlyFormed(a)) ||            // the recently-FORMED first (the operator's #1)
    (recentlyBattled(b) - recentlyBattled(a)) ||          // the recent battles second
    (zonePressureScore(b) - zonePressureScore(a)) ||      // the E1 pressure DESC (the C-4)
    (a.zfp - b.zfp) ||                                    // the failure prob ASC
    // THE C-3B REWRITE (2026-08-11 — Machine C, the zone-anchor law —
    // SITE-9): the PRICE tie-break (the ceiling distance from the open) is
    // REMOVED — replaced by the WIDTH DESC (the operator's scale law — "I
    // will not do 1 pip on a big zone... it needs to scale w/ the market
    // conditions" — the substantial structure over the sliver at equal
    // structural standing). "NOTHING SHOULD BE PRICE ANCHORED EVER."
    ((b.ceiling - b.floor) - (a.ceiling - a.floor)) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]!;
}

function zoneAsModel(zone: OperativeZone): ZoneModel {
  return { ...(zone as unknown as ZoneModel), id: zone.id, top: zone.ceiling, bottom: zone.floor };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKENS 1-7 — THE DETERMINISTIC 70%
// ═══════════════════════════════════════════════════════════════════════════

/** token 1 — zone-identification: the E2-designated operative zone + the
 *  classification + the death-rule verdict (incl. the phantom-BoM exemption). */
export function token1_zoneIdentification(zone: OperativeZone): ZoneVerdict {
  const reaction = zone.pressure?.mitigationCount ?? zone.reactionCount ?? 0;
  const virgin = reaction <= 1;
  const isMoM = zone.classification === 'MoM';
  let classification: ZoneVerdict['classification'] = zone.classification;
  let deathRuleVerdict: ZoneVerdict['deathRuleVerdict'] = 'CLEAR';
  const evidence: string[] = [
    `E1 zone ${zone.id} (${zone.type} ${zone.classification}, zfp ${zone.zfp}, reactions ${reaction})`,
  ];
  if (isMoM && virgin) {
    if (zone.phantom) {
      classification = 'PHANTOM_BOM';
      deathRuleVerdict = 'EXEMPT';
      evidence.push('virgin-MoM DEATH rule (shape-brain.ts:1150) overridden by the PHANTOM-BoM exemption — the type-2 virgin MoM = the FORTRESS');
    } else {
      deathRuleVerdict = 'DEATH';
      evidence.push('virgin-MoM DEATH rule: no phantom-BoM exemption — the E2 virgin-MoM reject lane');
    }
  }
  const conf = Math.min(1, Math.max(0, 0.3 + (100 - zone.zfp) / 200 + (classification === 'PHANTOM_BOM' ? 0.15 : 0)));
  return { zoneId: zone.id, classification, deathRuleVerdict, confidence: conf, evidence };
}

/** token 2 — pressure-status: the zone-pressure lifecycle read. */
export function token2_pressureStatus(zone: OperativeZone): PressureRead {
  const lifecycle = zone.pressure?.lifecycle ??
    (zone.reactionCount === 0 ? 'VIRGIN' : zone.reactionCount >= 3 ? 'DEPLETED' : zone.reactionCount === 1 ? 'ACTIVE_1' : 'ACTIVE_2');
  const zfpBias = ((100 - zone.zfp) / 100) * 0.4;
  const lcBias = lifecycle === 'VIRGIN' ? (zone.classification === 'BoM' ? 0.15 : 0.05)
    : lifecycle === 'FORTRESS' ? 0.2
    : lifecycle === 'ACTIVE_1' ? 0.05
    : lifecycle === 'ACTIVE_2' ? 0
    : lifecycle === 'DEPLETED' ? -0.2
    : lifecycle === 'BROKEN' ? -0.35
    : 0;
  const score = Math.min(1, Math.max(0, 0.35 + zfpBias + lcBias));
  return {
    side: zone.type === 'DEMAND' ? 'BUY' : 'SELL',
    lifecycle: String(lifecycle),
    score,
    mitigationCount: zone.pressure?.mitigationCount ?? zone.reactionCount,
    fortress: lifecycle === 'FORTRESS',
    pierced: zone.pressure?.pierced ?? false,
  };
}

/** token 3 — liquidity: the LMV rungs (the nested fuel + the shields). */
export function token3_liquidity(lmvTable: LmvTable, zone: OperativeZone): LiquidityRead {
  const nested = lmvTable.filter((r) => r.bottom >= zone.floor && r.top <= zone.ceiling);
  const below = lmvTable.filter((r) => r.top <= zone.floor);
  const above = lmvTable.filter((r) => r.bottom >= zone.ceiling);
  const shields = zone.pressure?.liquidity ?? [];
  const nearest = nested.length > 0
    ? [...nested].sort((a, b) => a.zfp - b.zfp)[0] as LqzZoneMatrix
    : zone.type === 'DEMAND'
      ? [...below].sort((a, b) => b.top - a.top)[0]
      : [...above].sort((a, b) => a.bottom - b.bottom)[0];
  return {
    liquidityBelow: below.length,
    liquidityAbove: above.length,
    nearestLqz: nearest ? `LMV-${nearest.center.toFixed(5)}` : null,
    nestedRungs: nested.length,
    shieldRungs: shields.length,
  };
}

/** token 4 — break-validation: the E1 pressure vs the structure break. */
export function token4_breakValidation(zone: OperativeZone, narrative: WeeklyNarrative | null): ValidationSignal {
  const pierced = zone.pressure?.pierced ?? false;
  const closeBeyond = zone.sourceZone?.reactionEvents?.some((e) => e.pierced) ?? false;
  const broken = pierced || closeBeyond;
  let breakVerdict: ValidationSignal['breakVerdict'] = 'UNBROKEN';
  if (broken) breakVerdict = 'INVALID';
  else if (narrative?.postBreakZoneId) {
    breakVerdict = narrative.postBreakZoneId === zone.id ? 'INVALID' : 'VALID';
  }
  return {
    breakVerdict,
    closeBeyond: broken,
    wickReclaim: !broken && (zone.reactionCount ?? 0) >= 1,
    narrativeRef: narrative?.postBreakZoneId ?? null,
  };
}

export interface BarLike { high: number; low: number; close: number; open: number; }

/** token 5 — strength-comparison: the comparative impulse strengths. */
export function token5_strengthComparison(moveBars: ReadonlyArray<BarLike>): StrengthSignal {
  let upRange = 0;
  let downRange = 0;
  for (const b of moveBars) {
    const range = b.high - b.low;
    if (b.close >= b.open) upRange += range;
    else downRange += range;
  }
  const total = upRange + downRange;
  const delta = total > 0 ? Math.abs(upRange - downRange) / total : 0;
  const impulseRatio = downRange > 0 ? upRange / downRange : upRange > 0 ? Number.POSITIVE_INFINITY : 1;
  const strongerSide: 'BUY' | 'SELL' = upRange > downRange ? 'BUY' : downRange > upRange ? 'SELL' : 'BUY';
  return { strongerSide, delta, impulseRatio };
}

/** token 6 — reaction-count: the mitigation math (the "third mitigation" doctrine). */
export function token6_reactionCount(zone: OperativeZone): number {
  return zone.pressure?.mitigationCount ?? zone.reactionCount ?? 0;
}

export interface DayLike { day: string; shape: string; direction?: string; confidence?: number; }

/** token 7 — chain-progress: the shape-chain position. */
export function token7_chainProgress(chain: ReadonlyArray<DayLike>, dayIndex: number): ChainPosition {
  const stage = chain[dayIndex]?.shape ?? 'UNKNOWN';
  const dir = chain[dayIndex]?.direction;
  return {
    chainStage: String(stage),
    chainDirection: dir === 'LONG' || dir === 'SHORT' ? dir : null,
    chainProgress: chain.length > 0 ? (dayIndex + 1) / chain.length : 0,
    daysRemaining: Math.max(0, chain.length - 1 - dayIndex),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKENS 8-11 — THE LLM-HOOKED 30% (the deterministic skeleton + the shadow)
// ═══════════════════════════════════════════════════════════════════════════

function deterministicForwardPosition(ctx: TokenSetContext, targets: number[]): ForwardProjectionOutput {
  const { operativeZone: zone, direction, dayOpenSpot, input } = ctx;
  const side = zone.type === 'SUPPLY' ? 'SUPPLY' : 'DEMAND';
  const forwardPosition = internalNearEdge(zone, input.lmvTable, side);
  const chosenTarget = targets[0] ?? forwardPosition;
  // THE FORWARD-POSITION PREDICATE (the operator's "the short is halfway to the
  // demand" — macro-context-driven, visibly obvious from the OHLC): the price
  // sits BETWEEN the zone and the target, with the recent momentum carrying it
  // toward the zone.
  const between = direction === 'LONG'
    ? forwardPosition <= dayOpenSpot && dayOpenSpot <= chosenTarget
    : chosenTarget <= dayOpenSpot && dayOpenSpot <= forwardPosition;
  const bars = input.barsByTf['1H'] ?? [];
  const last = bars.length > 0 ? bars[bars.length - 1] : null;
  const momentumToward = last
    ? (direction === 'LONG' ? last.close <= dayOpenSpot : last.close >= dayOpenSpot)
    : true;
  const distancePips = Math.abs(dayOpenSpot - forwardPosition) / input.pip;
  const positionVerdict = between && momentumToward && distancePips > 0 ? 'FORWARD' : 'NOT_FORWARD';
  return {
    forwardPosition,
    chosenTarget,
    positionVerdict,
    reasonTrace: [
      `zone near edge ${forwardPosition.toFixed(5)} (${side === 'SUPPLY' ? 'floor' : 'ceiling'})`,
      `day open ${dayOpenSpot.toFixed(5)} between zone and target ${chosenTarget.toFixed(5)}: ${between}`,
      `momentum toward the zone: ${momentumToward}`,
      `distance ${distancePips.toFixed(1)} pips`,
    ],
    llmRefined: false,
  };
}

function recordShadowDegrade(ctx: TokenSetContext, op: string, reason: string): void {
  recordFailure({
    component: `${ctx.input.pair} ${ctx.dayKey} ${ctx.direction}`,
    reason: 'SHADOW_DEGRADE',
    context: { op, reason, pair: ctx.input.pair, day: ctx.dayKey },
    attempts: 1,
    week: ctx.input.week,
    pair: ctx.input.pair,
  });
}

/** token 8 — forward-position: the LLM hook (the shadow refines) with the
 *  deterministic fallback (the chain NEVER hangs on the LLM). */
export async function token8_forwardPosition(ctx: TokenSetContext): Promise<ForwardProjectionOutput> {
  const { input, operativeZone: zone, direction, dayOpenSpot } = ctx;
  const targets = continuationTargetsFor(input.model, zone, direction);
  const fp = deterministicForwardPosition(ctx, targets);
  const sr = input.shadow
    ? await input.shadow.projectForward({
        pair: input.pair,
        tokenLedger: ctx.tokens,
        operativeZone: zone,
        dayOpenSpot,
        continuationTargets: targets,
        widthRatio: ctx.widthRatio,
        bars: input.barsByTf['1H'] ?? [],
        pip: input.pip,
        macro: input.macro,
      })
    : null;
  // THE OBVIOUS-TRADES LEXICON CONSULT (the W4 module's baseline — the
  // operator's golden-doc forward-position reasoning as evidence; the W6 STEP
  // B tool reads it via the token ledger).
  const lexiconEvidence = consultObviousTradesLexicon(
    input, 'forward-position', `${fp.positionVerdict}@${fp.forwardPosition.toFixed(5)}`,
  );
  if (sr?.ok) {
    return {
      ...sr.result,
      reasonTrace: [...fp.reasonTrace, ...sr.result.reasonTrace, ...lexiconEvidence],
    };
  }
  if (sr) recordShadowDegrade(ctx, 'projectForward', sr.reason);
  return { ...fp, reasonTrace: [...fp.reasonTrace, ...lexiconEvidence] };
}

/** token 9 — chaining: the TP of N = the entry of N+1 (Law 27). */
export function token9_chaining(priorTp: number | undefined): number {
  return priorTp ?? 0;
}

/**
 * THE OBVIOUS-TRADES LEXICON CONSULT (the W4 wave's module — the spec's §5.2
 * X6: "the operator's golden-doc analyses as the baseline"). The lexicon is
 * registered in the ReasoningChainInput.lexicons bag under the
 * LEXICON_SPEC's TradingLexiconRule interface (id 'obvious-trades' +
 * classify(input) → {intent, confidence, action}). The token 8/10/11 hooks
 * CONSULT its families' verdicts as the forward-reasoning evidence — the
 * operator's EU analyses verbatim. DEFENSIVE: when the W4 module has not
 * landed (the bag lacks the lexicon), the consult returns [] and the chain
 * runs the deterministic skeleton unchanged — the consult never throws,
 * never blocks a setup.
 */
function consultObviousTradesLexicon(
  input: ReasoningChainInput,
  token: TokenId,
  verdict: string,
): string[] {
  const bag = input.lexicons;
  if (!bag || typeof bag !== 'object') return [];
  // The LEXICON_SPEC's registered id (both the kebab-case and the
  // camelCase key — whichever the W4 module registers).
  const lexicon = (bag as Record<string, unknown>)['obvious-trades']
    ?? (bag as Record<string, unknown>).obviousTrades;
  if (!lexicon || typeof lexicon !== 'object') return [];
  const rule = lexicon as {
    id?: unknown;
    classify?: (inp: unknown) => unknown;
    families?: Array<{ group?: string; descriptive?: unknown[]; suggestive?: unknown[] }>;
  };
  if (rule.id !== 'obvious-trades' && rule.id !== undefined) return [];
  const hasFamilies = Array.isArray(rule.families) && rule.families.length > 0;
  // The classify contract: { intent, confidence, action } — the MPSE law
  // (a deterministic verdict, never a bare string).
  let intent: unknown;
  let confidence: number | undefined;
  if (typeof rule.classify === 'function') {
    try {
      const r = rule.classify({ token, verdict }) as
        | { intent?: unknown; confidence?: unknown; action?: unknown }
        | undefined;
      intent = r?.intent;
      confidence = typeof r?.confidence === 'number' ? r.confidence : undefined;
    } catch {
      // a lexicon predicate error is never a pipeline error — the chain
      // proceeds with the deterministic skeleton
    }
  }
  if (!hasFamilies && intent === undefined) return [];
  const fam = hasFamilies
    ? rule.families!.map((f) => `${f.group ?? 'family'}:${(f.suggestive?.length ?? 0) > (f.descriptive?.length ?? 0) ? 'FOR' : 'AGAINST'}`)
    : [];
  const conf = typeof confidence === 'number' ? ` (conf ${confidence.toFixed(2)})` : '';
  return [
    `obvious-trades:${token}:${typeof intent === 'string' ? intent : fam.join('|') || 'baseline'}${conf}`,
  ];
}

function isRewardSide(target: number, entry: number, direction: Direction): boolean {
  return direction === 'LONG' ? target > entry : target < entry;
}

/** The deterministic anchor floor (exported for the A2 diag probe — the D3
 *  law: a null structural TP returns null → the projection is NOT emitted).
 *  Returns the AnchorOutput (the mechanical floor the agent-in-session refines)
 *  or null when NO structural TP resolves. */
export function deterministicAnchors(
  ctx: TokenSetContext,
  fp: ForwardProjectionOutput,
  chainedEntry: number,
): AnchorOutput | null {
  const { input, operativeZone: zone, direction } = ctx;
  const e2ProjectionId = e2ProjectionIdFor(ctx);
  // ═══════════════════════════════════════════════════════════════════════
  // THE W-ADM-2 DELEGATION (the L2 spec §2.5 — the fixed constants DIE, the
  // SL + the VERDICT delegate to the ADM): the ENTRY + the TP keep the
  // chain's PROVEN W8B machinery (the golden 5/5 precision — the D-3c
  // chained gate + the internalNearEdge + computeLmvTP — NEVER re-derived
  // constants), while the SL — the F-1/F-2 outcome lever — DELEGATES to the
  // ADM's resolveSlDepth (the measured reaction-wick territory + the
  // zone-width scaling + the nesting depth + the defended extreme, CAPPED
  // by the RRR headroom — the operator: "the SL depth becomes a MEASURED
  // quantity, never a fixed pip"). THE ADM'S GEOMETRY-HONESTY VERDICT gates
  // the emission (the GU SHORT fix — 2026-08-11): the ADM's anchorTrade
  // measures the REAL defense (the GU SHORT's wick 46.2p / defended 65.5p)
  // → the RRR 2.84 < the 3.0 floor → RRR_BELOW_FLOOR → the lane dies — the
  // operator's flat-2R read reproduced by the ADM's measured geometry, while
  // the chain's entry/TP machinery holds the golden precision.
  // ═══════════════════════════════════════════════════════════════════════
  // THE ADM VERDICT FIRST (the geometry-honesty gate — the D3 law): the
  // ADM's anchorTrade measures the REAL defense + the REAL RRR. A REJECT
  // (DEGENERATE_PAIR_REJECTED / RRR_BELOW_FLOOR / NO_STRUCTURAL_TP) means
  // the trade does not exist — the lane emits NOTHING. The GU SHORT's
  // RRR 2.84 (the real wick 46.2p ÷ the real demand) dies here.
  const admInput: AdmInput = {
    model: input.model.zones,
    lmvTable: input.model.lmv.table,
    pair: input.pair,
    pip: input.pip,
    operativeZone: zone,
    direction,
    dayOpenSpot: ctx.dayOpenSpot,
    priorTp: chainedEntry > 0 ? chainedEntry : undefined,
    e1ZoneId: zone.id,
    e2ProjectionId,
    atr1hPips: input.atr1hPips,
  };
  const adm = anchorTrade(admInput);
  if (adm.verdict === 'REJECT') {
    recordFailure({
      component: `${input.pair} ${ctx.dayKey} ${direction}`,
      reason: 'GROUNDING_WARN',
      context: {
        check: 'ADM_REJECT',
        sourceRef: 'reasoning-chain:deterministicAnchors:anchorTrade',
        value: {
          verdict: adm.verdict,
          rejectReason: adm.rejectReason,
          rejectEvidence: adm.rejectEvidence,
          entry: adm.entry,
          sl: adm.sl,
          tp: adm.tp,
          rrr: adm.rrr,
        },
        proposed: `the ADM's measured geometry rejected the lane (${adm.rejectReason}) — the trade does not exist (the D3 law): the GU SHORT's flat-2R class dies here, the operator's "this was a flat 2R trade"`,
      },
      attempts: 1,
      week: input.week,
      pair: input.pair,
    });
    return null;
  }
  // THE ENTRY — the D-3c chained gate (the W8B verified) + the internalNearEdge.
  let entry: number;
  let entryMethod: string;
  const chainedWindowPips = 15 * input.pip; // the D11 dual-entry window
  const chainedNearZone = chainedEntry > 0 && (
    direction === 'LONG'
      ? chainedEntry >= zone.floor - chainedWindowPips && chainedEntry <= zone.ceiling + chainedWindowPips
      : chainedEntry <= zone.ceiling + chainedWindowPips && chainedEntry >= zone.floor - chainedWindowPips
  );
  if (chainedNearZone) {
    if (direction === 'LONG') {
      // THE CHAINED-INTERIOR SNAP (the DEFECT-M fix — 2026-08-11, the operator's
      // chaining law VERBATIM: "Set E at the TP level of trade #1" — the
      // receiving STRUCTURE's INTERIOR-reaction level, never a deep fill at the
      // band's lower interior): the raw chained TP is consumed through the ADM's
      // resolveEntry (the W-ADM-2 delegation the chain already imports) — the
      // chained-snap clamp (the priorTp clamped into the receiving band) PLUS
      // the LONG's interior-reaction defended edge — the fill = the MAX of the
      // two. The EU LONG: the EU SHORT's TP 1.14040 chains in (inside the D11
      // 15p window of the fortress DEMAND [1.14004-1.14147]), but the fortress's
      // interior-reaction resolves to the internal rung's defended edge 1.14110
      // (the operator's drawn 1.14110-1.14120 near edge) — max(1.14040, 1.14110)
      // = 1.14110, the golden, never the deep 1.14040 fill.
      const chainedSnap = resolveEntry(zone, 'LONG', input.model.lmv.table, input.pip, chainedEntry);
      const interiorReaction = resolveEntry(zone, 'LONG', input.model.lmv.table, input.pip);
      entry = Math.max(chainedSnap.entry, interiorReaction.entry);
      entryMethod = `chained-interior (Law 27 — the TP-of-N = the receiving structure's interior-reaction level; ${chainedSnap.method} + ${interiorReaction.method})`;
    } else {
      entry = chainedEntry;
      entryMethod = 'chained (TP-of-N = entry-of-N+1 — Law 27)';
    }
  } else {
    // THE C-2 FIX (2026-08-11 — Machine C): the entry-edge side derives from
    // the LANE DIRECTION + the rung's BATTLE SIDE, never the container-typed
    // zone type. The EU SHORT's golden rung [1.1439-1.14415] (SELL_SIDE —
    // the operator's entry 1.14390 = the near edge from below) is typed
    // DEMAND by the resting-side pass (inside the DEMAND container
    // [1.14272-1.14434]) → the old `zone.type === 'SUPPLY' ? 'SUPPLY' :
    // 'DEMAND'` routed it to the DEMAND branch → the entry = the CEILING
    // 1.14415 (Δ2.0p — the near edge from ABOVE — the wrong side of the
    // operator's structure). The SHORT lane's entry edge = the SUPPLY side
    // (the SELL_SIDE rung's FLOOR — the first contact from below); the LONG
    // lane's = the DEMAND side. The battle side (sourceZone.side) wins over
    // the container type.
    const battleSide = (zone as { sourceZone?: { side?: string } }).sourceZone?.side;
    const entryEdgeSide: 'SUPPLY' | 'DEMAND' =
      battleSide === 'SELL_SIDE' ? 'SUPPLY'
        : battleSide === 'BUY_SIDE' ? 'DEMAND'
          : direction === 'SHORT' ? 'SUPPLY' : 'DEMAND';
    entry = internalNearEdge(zone, input.lmvTable, entryEdgeSide);
    entryMethod = chainedEntry > 0
      ? 'zone-internal-near-edge (the chained TP rejected — beyond the D11 15p dual-entry window — the anchor trace holds)'
      : 'zone-internal-near-edge';
  }
  // THE SL — THE ADM's MEASURED PLACEMENT (the W-ADM-2 delegation — the
  // F-1/F-2 outcome lever): resolveSlDepth over the operative zone + the
  // model (the reaction-wick / the zone-width / the nesting / the defended
  // extreme), the level = the zone-anchored close-edge placement when the
  // entry is outside the zone (the EU SHORT: floor + depth = 1.14485), the
  // entry-anchored when inside (the DXY SHORT: entry + depth = 101.184).
  const anchorZone = zoneAsModel(zone);
  const slDepth = resolveSlDepth(
    zone, direction, input.model.zones, input.pip,
    getAnalysisPointMs(), input.atr1hPips, 0, entry,
  );
  if (process.env.C2_DEBUG && input.pair === 'EUR/USD' && direction === 'SHORT') console.log(`[C2-SL] ${input.pair} ${ctx.dayKey} zone=${zone.id}[${zone.floor.toFixed(5)},${zone.ceiling.toFixed(5)}] entry=${entry} atr=${input.atr1hPips} depth=${slDepth.depthPips} method=${slDepth.method}`);
  const entryOutsideZone = direction === 'SHORT'
    ? entry <= zone.floor - 1e-9
    : entry >= zone.ceiling + 1e-9;
  const sl = direction === 'SHORT'
    ? (entryOutsideZone ? zone.floor + slDepth.depthPips * input.pip : entry + slDepth.depthPips * input.pip)
    : (entryOutsideZone ? zone.ceiling - slDepth.depthPips * input.pip : entry - slDepth.depthPips * input.pip);
  const slMethod = `measured (the ADM's resolveSlDepth — ${slDepth.method})`;
  // THE TP — the chain's PROVEN W8B machinery (the full model + the W-ADM-3
  // W6 gate at every candidate — the degenerate-rung rejection).
  const zrTp = computeLmvTP(
    entry, sl, direction, input.model, input.pair, input.pip,
    { passThroughWeakWalls: true, structuralExtension: true, e1PressureClassification: true },
    ctx.e2Day,
  );
  let tp: number;
  let tpMethod: string;
  let tpRungId: string | undefined;
  if (zrTp) {
    // THE ADM STRUCTURAL-WALK CONSULT (the W-ADM-5 OUTCOME-SIDE fix —
    // 2026-08-11, the EU LONG class): the operator's "the TP = the first
    // DEFENDED opposing structure's near edge" — the ADM's resolveTp walk
    // (the zone-near-edge-first) lands the EU LONG's TP at the EU #1
    // supply's floor 1.14460 (the MFE-reachable level) vs computeLmvTP's
    // 1.14620 (the internal-rung defEdge BEYOND the measured reach — the
    // LOSS). The LONG lanes take the CLOSER of the two (the first-contact
    // doctrine — the operator's "NEVER the nearest" is the significance
    // walk's fallback, the first DEFENDED structure is the target). The
    // SHORT lanes keep computeLmvTP byte-identical (the golden 5/5 chaining
    // — the DXY SHORT's TP 100.918 must stay the DXY LONG's chained entry).
    const admTp = resolveTp(zone, direction, input.model.lmv.table, input.pip, input.model.zones, entry);
    if (direction === 'LONG' && admTp && admTp.tp < zrTp.tp) {
      tp = admTp.tp;
      tpMethod = `structural-zone walk (the ADM — ${admTp.method})`;
      tpRungId = undefined;
    } else {
      tp = zrTp.tp;
      tpMethod = 'e2-projected-opposing-zone-full-model (ZR-3.3 + ZR-3.4)';
      tpRungId = zrTp.rungId;
    }
    const risk = Math.abs(entry - sl);
    const rrrCheck = risk > 0 ? Math.abs(tp - entry) / risk : 0;
    // THE MEASURED-REACTION-TP GUARD (the W-ADM-5 OUTCOME-SIDE fix — the EU
    // LONG class): a TP that IS the first opposing structure's measured
    // reaction level (the ADM's defEdge-outside fallback — the EU #1
    // supply's reaction 1.14479 — the level the price has ACTUALLY been
    // defended at) is the operator's TARGET — the closest-edge cap extension
    // (capTpAtNearestOpposingSd) must NOT override it with the next shelf
    // (the [1.14512-1.14529] rung's bottom 1.14512 — 3.2p beyond the real
    // 1.14480 reach — the LOSS). The cap extension is for the degenerate
    // computeLmvTP shelves only.
    if (rrrCheck < RRR_GATE - 1e-9 && !tpMethod.includes('measured reaction level')) {
      const capped = capTpAtNearestOpposingSd(entry, sl, direction, input.model, input.pip);
      if (capped) {
        tp = capped.tp;
        tpMethod = 'e2-projected-opposing-zone-full-model (closest-edge extension — the operator\'s EU #1 rule)';
        tpRungId = capped.rungId;
      } else {
        recordFailure({
          component: `${input.pair} ${ctx.dayKey} ${direction}`,
          reason: 'GROUNDING_WARN',
          context: {
            check: 'DEGENERATE_TP_CAP_FAILED',
            sourceRef: 'reasoning-chain:deterministicAnchors',
            value: { entry, sl, riskPips: risk / input.pip, degenerateTp: tp, rrr: rrrCheck },
            proposed: 'the degenerate TP could not be extended to the first opposing S/D zone\'s internal LQZ',
          },
          attempts: 1,
          week: input.week,
          pair: input.pair,
        });
      }
    }
  } else {
    const tpRes = computeMirrorTP(entry, sl, anchorZone, direction, input.model.ladder, input.pip, { passThroughWeakWalls: true });
    if (tpRes) {
      tp = tpRes.tp;
      tpMethod = 'mirror-law14-walk';
      tpRungId = tpRes.rungId;
    } else if (isRewardSide(fp.chosenTarget, entry, direction)) {
      tp = fp.chosenTarget;
      tpMethod = 'continuation-target (KCE)';
    } else {
      return null; // NO structural TP — the trade does not exist (never the 2.5 clamp)
    }
  }
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rrr = risk > 0 ? reward / risk : 0;
  // THE ADM'S GEOMETRY-HONESTY VERDICT (the GU SHORT fix — 2026-08-11, the
  // orchestrator's audit): the final geometry (the chain's entry/TP + the
  // ADM's measured SL) is verified by the ADM's isDegeneratePair — an RRR
  // whose SL comes from a sliver or whose TP comes from a degenerate rung is
  // NOT a measurement → the DEGENERATE_PAIR_REJECTED (the operator's 16.8
  // class — "what the actual FUCK is this? this was a flat 2R trade"). The
  // GU SHORT's TP 1.32850 from the zero-width rung [1.32673-1.32673] dies
  // here — the lane emits NOTHING (the D3 law), the verdict recorded.
  const minViableSliver = measureMinViableDefensePips(input.model.zones, input.pip);
  if (isDegeneratePair(entry, sl, tp, input.pip, minViableSliver)) {
    recordFailure({
      component: `${input.pair} ${ctx.dayKey} ${direction}`,
      reason: 'GROUNDING_WARN',
      context: {
        check: 'ADM_REJECT',
        sourceRef: 'reasoning-chain:deterministicAnchors:geometry-honesty',
        value: {
          verdict: 'REJECT',
          rejectReason: 'DEGENERATE_PAIR_REJECTED',
          entry, sl, tp, rrr,
          rejectEvidence: [`the final geometry's SL risk ${(risk / input.pip).toFixed(1)}p < the min-viable defense ${minViableSliver.toFixed(1)}p OR the TP is degenerate — the operator's 16.8 class: "this was a flat 2R trade" — never an emission`],
        },
        proposed: 'the degenerate pair is rejected (the D3 law) — the lane emits NOTHING, the verdict recorded in the failure store',
      },
      attempts: 1,
      week: input.week,
      pair: input.pair,
    });
    return null;
  }
  const anchors: ProjectionAnchor[] = [
    { role: 'ENTRY', price: entry, e1ZoneId: zone.id, e2ProjectionId, method: entryMethod, rungId: slDepth.entryLever ? undefined : undefined },
    { role: 'SL', price: sl, e1ZoneId: zone.id, e2ProjectionId, method: slMethod },
    { role: 'TP', price: tp, e1ZoneId: zone.id, e2ProjectionId, method: tpMethod, rungId: tpRungId },
  ];
  return { entry, sl, tp, rrr, anchors, entryRungId: undefined, llmRefined: false };
}

function e2ProjectionIdFor(ctx: TokenSetContext): string {
  return `${ctx.input.pair}|${ctx.dayKey}|${ctx.shape}|${ctx.direction}`;
}

/** token 10 — anchor construction: the E/SL/TP (the checkable numbers), the
 *  shadow refines (the LLM may ONLY refine — never invent ids or prices).
 *  A null deterministic floor = NO structural TP → the projection is NOT
 *  emitted (the D3 law — the trade does not exist, never a fabricated one). */
export async function token10_anchorConstruction(
  ctx: TokenSetContext,
  fp: ForwardProjectionOutput,
  chainedEntry: number,
): Promise<AnchorOutput | null> {
  const { input, operativeZone: zone, direction } = ctx;
  const det = deterministicAnchors(ctx, fp, chainedEntry);
  if (det === null) return null;
  const e2ProjectionId = e2ProjectionIdFor(ctx);
  const anchorZone = zoneAsModel(zone);
  const slCandidate = computeMirrorSL(det.entry, anchorZone, direction, input.model.ladder, input.pair, input.pip, input.atr1hPips)?.sl ?? null;
  const tpCandidate = slCandidate !== null
    ? computeMirrorTP(det.entry, slCandidate, anchorZone, direction, input.model.ladder, input.pip, { passThroughWeakWalls: true })?.tp ?? null
    : null;
  const sr = input.shadow
    ? await input.shadow.anchor({
        pair: input.pair,
        direction,
        operativeZone: zone,
        tokenLedger: ctx.tokens,
        e2ProjectionId,
        slCandidate,
        tpCandidate,
        atr1hPips: input.atr1hPips,
        widthRatio: ctx.widthRatio,
        pip: input.pip,
      })
    : null;
  if (sr?.ok) return sr.result;
  if (sr) recordShadowDegrade(ctx, 'anchor', sr.reason);
  return det;
}

/** token 11 — the projection vs the E2 chain (the divergence = the refinement
 *  warning with the context — the operator's "the chain's projections vs the
 *  E2's chain"). The hard validity is the mechanical floor's (runRefineRetry). */
export function token11_validation(
  projection: TradeProjection,
  e2Chain: ReadonlyArray<DayLike>,
  input?: ReasoningChainInput,
): ValidationVerdict {
  const warnings: RefinementWarning[] = [];
  const e2Day = e2Chain.find((d) => d.day === projection.day);
  const diverged = e2Day !== undefined && !!e2Day.direction && e2Day.direction !== projection.direction;
  if (diverged) {
    warnings.push({
      check: 'E2_CHAIN_DIVERGENCE',
      token: 'validation',
      sourceRef: `e2:${projection.pair}:${projection.day}`,
      value: { e2Direction: e2Day?.direction, projection: projection.direction, shape: e2Day?.shape },
      proposed: `the projection ${projection.direction} validates/refines the E2 day ${e2Day?.direction} (${e2Day?.shape}) — the forward-reasoning lane refines the E2 BEFORE the E3`,
    });
  }
  // The E2-chain divergence is a REFINEMENT WARNING, never an invalidation —
  // the projection emits (the forward lane refines the E2, per the doctrine).
  // THE OBVIOUS-TRADES LEXICON CONSULT (the W4 module's baseline — the
  // operator's golden-doc validation reasoning as the evidence).
  const lexiconEvidence = input
    ? consultObviousTradesLexicon(input, 'validation', `${projection.direction} E ${projection.E.toFixed(5)} SL ${projection.SL.toFixed(5)} TP ${projection.TP.toFixed(5)}`)
    : [];
  const aligned = warnings.every((w) => w.check === 'E2_CHAIN_DIVERGENCE');
  const withLexicon: ValidationVerdict = {
    valid: aligned,
    warnings,
    confidence: projection.confidence,
  };
  if (lexiconEvidence.length > 0 && warnings.length === 0) {
    warnings.push({
      check: 'OBVIOUS_TRADES_BASELINE',
      token: 'validation',
      sourceRef: 'obvious-trades-lexicon',
      value: lexiconEvidence,
      proposed: 'the operator\'s golden-doc baseline — the confluence alignment check (E1 pressure + E2 chain + E3 geometry all agree)',
    });
    return { valid: true, warnings, confidence: projection.confidence };
  }
  return withLexicon;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE E3-NEVER CONTRACT + THE MECHANICAL FLOOR + THE REFINE LOOP
// ═══════════════════════════════════════════════════════════════════════════

export class ProjectionContractError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ProjectionContractError';
  }
}

/** The E3-NEVER mechanical enforcement (the L1 §4.1): every anchor carries the
 *  e1ZoneId + e2ProjectionId; LONG SL < E < TP; SHORT TP < E < SL; RRR finite
 *  positive; confidence in [0,1]. Throws — a violation is a pipeline error. */
export function assertProjectionContract(p: TradeProjection): void {
  if (!p.anchors || p.anchors.length === 0) {
    throw new ProjectionContractError(`E3-NEVER: ${p.setupId} has no anchors`);
  }
  for (const a of p.anchors) {
    if (!a.e1ZoneId || !a.e2ProjectionId) {
      throw new ProjectionContractError(`E3-NEVER: ${p.setupId} anchor ${a.role} lacks e1ZoneId/e2ProjectionId (${String(a.e1ZoneId)}/${String(a.e2ProjectionId)})`);
    }
  }
  if (p.direction === 'LONG' && !(p.SL < p.E && p.E < p.TP)) {
    throw new ProjectionContractError(`E3-NEVER: ${p.setupId} LONG requires SL < E < TP (got E=${p.E} SL=${p.SL} TP=${p.TP})`);
  }
  if (p.direction === 'SHORT' && !(p.TP < p.E && p.E < p.SL)) {
    throw new ProjectionContractError(`E3-NEVER: ${p.setupId} SHORT requires TP < E < SL (got E=${p.E} SL=${p.SL} TP=${p.TP})`);
  }
  if (!Number.isFinite(p.RRR) || p.RRR <= 0) {
    throw new ProjectionContractError(`E3-NEVER: ${p.setupId} RRR must be a positive finite number`);
  }
  if (p.confidence < 0 || p.confidence > 1) {
    throw new ProjectionContractError(`E3-NEVER: ${p.setupId} confidence out of [0,1]`);
  }
}

function contractHolds(p: TradeProjection): boolean {
  try {
    assertProjectionContract(p);
    return true;
  } catch {
    return false;
  }
}

/** The deterministic mechanical floor — the validity authority the LLM can
 *  never override. The RRR gate (≥ 2.5) is the hard floor; the macro divergence
 *  is a recorded warning (the macro wins, never suppresses). */
export function computeMechanicalFloor(p: TradeProjection, input: ReasoningChainInput): ValidationOutput {
  const warnings: RefinementWarning[] = [];
  const contractOk = contractHolds(p);
  const rrrOk = p.RRR >= RRR_GATE - 1e-9;
  const macroOk = p.direction === input.macro.direction;
  if (!contractOk) {
    let msg = 'E3-NEVER: the projection failed assertProjectionContract';
    try {
      assertProjectionContract(p);
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
    warnings.push({
      check: 'CONTRACT_VIOLATION',
      token: 'validation',
      sourceRef: p.setupId,
      value: { E: p.E, SL: p.SL, TP: p.TP, direction: p.direction, anchors: p.anchors },
      proposed: msg,
    });
    return { valid: false, warnings, confidence: 0 };
  }
  if (!rrrOk) {
    warnings.push({
      check: 'RRR_BELOW_GATE',
      token: 'anchors',
      sourceRef: p.setupId,
      value: p.RRR,
      proposed: `the RRR ${p.RRR.toFixed(2)} < ${RRR_GATE} — extend the TP to the next structural target (the continuation target / the ZR-3.3 opposing-zone full-model resolution) and re-run tokens 8-11 — the RRR is a CONSEQUENCE, never a target`,
    });
  }
  if (!macroOk) {
    warnings.push({
      check: 'MACRO_DIVERGENCE',
      token: 'chaining',
      sourceRef: p.setupId,
      value: { projection: p.direction, macro: input.macro.direction },
      proposed: 'the unified macro authority wins the emission — record the divergence, never suppress it',
    });
  }
  return { valid: contractOk && rrrOk, warnings, confidence: p.confidence };
}

/** The refinement (the E2 validated/refined/retried BEFORE the E3): re-runs the
 *  forward-projection anchors with the warnings as the context — the
 *  deterministic 1-7 are NEVER re-run. */
function refineProjection(
  p: TradeProjection,
  warnings: RefinementWarning[],
  ctx: TokenSetContext,
  input: ReasoningChainInput,
): TradeProjection {
  const dir = p.direction;
  const zone = ctx.operativeZone;
  const entry = p.E;
  const anchorZone = zoneAsModel(zone);
  // THE W-ADM-2 ADM-DELEGATED SL (the L2 spec §2.5.2 — the D-4b constants
  // DIE here): the refine loop's SL recompute delegates to the ADM's
  // resolveSlDepth — the SAME measured placement as the emission (the
  // reaction-wick territory + the zone-width scaling + the nesting depth +
  // the defended extreme + the RRR-headroom cap). The refine loop NEVER
  // re-introduces a fixed pip constant (the 1.5p-inside / the
  // atr-scaled buffer floor — the F-1/F-2 class): the SL depth is a
  // MEASURED quantity, in the EMISSION and in the REFINE (the operator: "the
  // SL depth becomes a MEASURED quantity, never a fixed pip").
  const analysisPointMs = getAnalysisPointMs();
  const slDepth = resolveSlDepth(
    zone, dir, input.model.zones, input.pip, analysisPointMs, input.atr1hPips, p.TP, entry,
  );
  // THE SL ANCHOR (the W-ADM-5 OUTCOME-SIDE fix — 2026-08-11, the DXY LONG
  // class): the refine loop's SL must anchor IDENTICALLY to the emission's
  // deterministicAnchors — the ENTRY when the entry is inside the zone (the
  // DXY LONG: the entry 100.918 inside [100.86-100.94] → SL = entry − depth
  // = the risk-side mark), the ZONE edge when the entry is outside (the EU
  // SHORT: the entry 1.14390 below the supply's floor 1.14460 → SL = the
  // floor + depth = the operator's "the supply IS the SL anchor"). The
  // pre-fix unconditional zone-edge anchor (ceiling − depth for the LONG)
  // placed the DXY LONG's SL 2.2p ABOVE the entry-anchored level — the
  // razor-thin 8.5p risk the real 11.5p dip ate. The entry-vs-zone
  // conditional reproduces the deterministicAnchors' exact geometry.
  const entryOutsideZone = dir === 'SHORT'
    ? entry <= zone.floor - 1e-9
    : entry >= zone.ceiling + 1e-9;
  let sl = dir === 'SHORT'
    ? (entryOutsideZone ? zone.floor + slDepth.depthPips * input.pip : entry + slDepth.depthPips * input.pip)
    : (entryOutsideZone ? zone.ceiling - slDepth.depthPips * input.pip : entry - slDepth.depthPips * input.pip);
  let slMethod = slDepth.method;
  const slRungId = zone.id;
  let risk = Math.abs(entry - sl);
  let tp = p.TP;
  let tpMethod = p.anchors.find((a) => a.role === 'TP')?.method ?? 'refined';
  const rrrBelowGate = warnings.some((w) => w.check === 'RRR_BELOW_GATE');
  const currentRrr = risk > 0 ? Math.abs(tp - entry) / risk : 0;
  // THE MEASURED-REACTION-TP GUARD (the W-ADM-5 OUTCOME-SIDE fix — 2026-08-11,
  // the EU LONG class): a TP that IS the first opposing structure's MEASURED
  // REACTION level (the ADM resolveTp's defEdge-outside fallback — the level
  // the price has ACTUALLY been defended at — the EU LONG's 1.14479 = the EU
  // #1 supply's reaction) is the TARGET — the refine loop must NOT extend
  // past it (the extension to the next shelf 1.14503 overshot the measured
  // reach 1.14480 and lost). The extension is for the NON-reaction TPs (the
  // rung-defEdge / computeLmvTP shelves — the DXY LONG's 101.110 — which
  // must walk to the next DEFENDED wall).
  const tpIsMeasuredReaction = p.anchors.find((a) => a.role === 'TP')?.method?.includes('measured reaction level') ?? false;
  if ((rrrBelowGate || currentRrr < RRR_GATE - 1e-9) && !tpIsMeasuredReaction) {
    // THE FULL-TARGET EXTENSION (the W-ADM-5 OUTCOME-SIDE fix — 2026-08-11,
    // the DXY LONG class): the continuation extension must see the FULL
    // structural set beyond the current TP — the continuationTargetsFor's
    // slice(0,5) closed-set cap is the stranglehold (the 5 nearest targets
    // are ALL below the computeLmvTP 101.240, so the extension's beyond-set
    // was EMPTY and the TP could never reach the next defended wall). The
    // full set walks ALL 1H/30m/15m opposing S/D ZONES (the 4H zones are the
    // MACRO context — the operator's "nested supply within a 1H refined 4H
    // supply OB" — and the bare LADDER shelves are the mirror-law substrate,
    // never the operator's defended structures — the ladder's 101.120 shelf
    // was a razor-TP the real dip ate). The DXY LONG: beyond 101.110 → the
    // OB [101.269-101.373] wall — the sweep-verified WIN.
    const fullTargets = (() => {
      const set = new Set<number>();
      for (const z of input.model.zones) {
        if (z.timeframe === '4H') continue; // the 4H = the macro context, never an operative TP
        if (dir === 'LONG' && z.type === 'SUPPLY' && z.bottom > zone.ceiling) set.add(z.bottom);
        if (dir === 'SHORT' && z.type === 'DEMAND' && z.top < zone.floor) set.add(z.top);
      }
      return [...set].sort((a, b) => (dir === 'LONG' ? a - b : b - a));
    })();
    const beyond = fullTargets.filter((t) => (dir === 'LONG' ? t > tp : t < tp));
    if (beyond.length > 0) {
      tp = beyond[0] as number;
      tpMethod = 'continuation-target (refined — the full 1H structural set, the W-ADM-5 walk)';
      // THE SL RE-RESOLVE (the W-ADM-5 OUTCOME-SIDE fix — 2026-08-11, the DXY
      // LONG class): the extended TP RELAXES the RRR-headroom cap — the SL
      // depth must re-resolve against the NEW TP so the deeper SL the
      // headroom now allows actually lands (the operator's "the TP extends
      // so the deeper SL survives"). The pre-fix extension kept the OLD TP's
      // tight SL — the razor that the real dip ate.
      const slDepth2 = resolveSlDepth(zone, dir, input.model.zones, input.pip, analysisPointMs, input.atr1hPips, tp, entry);
      const sl2 = dir === 'SHORT'
        ? (entryOutsideZone ? zone.floor + slDepth2.depthPips * input.pip : entry + slDepth2.depthPips * input.pip)
        : (entryOutsideZone ? zone.ceiling - slDepth2.depthPips * input.pip : entry - slDepth2.depthPips * input.pip);
      const sl2Risk = Math.abs(entry - sl2);
      // THE RRR HEADROOM CHECK (the W-ADM-5 geometry law — the operator's
      // "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE"): the extended TP must
      // still clear the 3.0 floor over the NEW deeper SL — a continuation
      // target whose reward cannot pay the deeper risk is skipped (the
      // walk continues to the next wall). The pre-fix accepted the first
      // beyond blindly — the razor-TP class.
      if (sl2Risk > 0 && Math.abs(tp - entry) / sl2Risk >= RRR_GATE - 1e-9) {
        sl = sl2;
        slMethod = slDepth2.method;
        risk = sl2Risk;
      } else {
        // The extended TP cannot pay the deeper SL — fall back to the
        // current TP (the honest RRR is the consequence, never a target).
        tp = p.TP;
        tpMethod = p.anchors.find((a) => a.role === 'TP')?.method ?? 'refined';
      }
    } else {
      // THE D3 LAW (the forced-RRR TP is REMOVED): a TP is NEVER computed
      // to hit a target RRR — the RRR is a consequence. The refine attempts
      // the chain's PROVEN full-model TP resolution (computeLmvTP — the
      // ZR-3.3 with the E2 shape day + the W-ADM-3 W6 gate at every
      // candidate, the degenerate-rung rejection). When NO structural TP
      // extends the reward, the TP STAYS — the projection's RRR remains the
      // honest consequence, the loop exhausts (REFINEMENT_EXHAUSTED → the
      // store).
      const zrExt = computeLmvTP(
        entry, sl, dir, input.model, input.pair, input.pip,
        { passThroughWeakWalls: true, structuralExtension: true, e1PressureClassification: true },
        ctx.e2Day,
      );
      if (zrExt && (dir === 'LONG' ? zrExt.tp > tp + 1e-9 : zrExt.tp < tp - 1e-9)) {
        tp = zrExt.tp;
        tpMethod = 'e2-projected-opposing-zone-full-model (refined — ZR-3.3 + ZR-3.4)';
      }
      // else: no structural extension — the TP stays (the RRR is the consequence)
    }
  }
  const reward = Math.abs(tp - entry);
  const rrr = risk > 0 ? reward / risk : 0;
  const anchors: ProjectionAnchor[] = p.anchors.map((a) =>
    a.role === 'SL' ? { ...a, price: sl, method: slMethod, rungId: slRungId }
    : a.role === 'TP' ? { ...a, price: tp, method: tpMethod }
    : a,
  );
  return { ...p, SL: sl, TP: tp, RRR: rrr, anchors };
}

/** THE VALIDATE / REFINE / RETRY LOOP (the L1 §7): the enforcement default is
 *  refine/retry; the hard-throw happens ONLY after MAX_REFINEMENTS failed
 *  refinements — and even then it is data (the failure store), never a crash. */
export async function runRefineRetry(
  proj: TradeProjection,
  input: ReasoningChainInput,
  ctx: TokenSetContext,
): Promise<{ projection: TradeProjection; valid: boolean; hardThrow: boolean; warnings: RefinementWarning[] }> {
  let p = proj;
  let n = 0;
  for (;;) {
    // Token 11: the mechanical floor is ALWAYS the validity authority; the
    // shadow's validateProjection contributes its flags + the confidence delta.
    const floor = computeMechanicalFloor(p, input);
    // THE GROUNDING WARN-SET (the D2 law — the CME §6.2 S2): the machine
    // validates the agent's output's grounding — W-3 the direction-order,
    // W-5 the e1ZoneId ∈ the E1 map, W-6 the e2ProjectionId ∈ the E2 chain,
    // W-7 the RRR computable — the SAME WARN set shadow-agent.ts exposes. A
    // violation is a WARN (the loop continues), never a hard-kill on the
    // first occurrence.
    // the deterministic forward-position from the projection's ledger (the
    // agent's grounding reference — W-1 validates the AGENT's read against
    // the machine's floor, never a bare absence)
    const fpToken = p.tokenLedger.find((t) => t.token === 'forward-position');
    const fpValue = fpToken?.evidence?.[0] ? Number.parseFloat(fpToken.evidence[0]) : Number.NaN;
    const groundWarns = validateAgentDecisions(
      {
        forwardPosition: Number.isFinite(fpValue) ? fpValue : 0,
        E: p.E,
        SL: p.SL,
        TP: p.TP,
        e1ZoneId: p.entryZoneId,
        e2ProjectionId: p.e2ProjectionId,
      },
      {
        continuationTargets: continuationTargetsFor(input.model, ctx.operativeZone, p.direction),
        e1ZoneIds: input.model.zones.map((z) => z.id),
        e2ProjectionIds: [e2ProjectionIdFor(ctx)],
      },
      p.direction,
    );
    const ledger: ChainContext = chainContextFor(p, input);
    const shadowV = input.shadow ? await input.shadow.validateProjection(p, ledger) : null;
    let v: ValidationOutput = {
      valid: floor.valid && groundWarns.length === 0,
      warnings: [...floor.warnings, ...groundWarns],
      confidence: p.confidence,
    };
    if (shadowV?.ok) {
      const llmOnly = shadowV.result.warnings.filter((w) => w.check === 'SHADOW_FLAG');
      v = {
        valid: v.valid,
        warnings: [...v.warnings, ...llmOnly],
        confidence: shadowV.result.confidence,
      };
    }
    const accepted = v.valid;
    if (accepted) return { projection: { ...p, validation: v }, valid: accepted, hardThrow: false, warnings: v.warnings };
    // THE D2 LAW — the grounding WARN semantics: EVERY failed validation
    // records its WARNs as GROUNDING_WARN rows (the failure store) and the
    // loop CONTINUES with the WARNs as the refinement input. The hard-throw
    // happens ONLY after MAX_REFINEMENTS — data, never a crash (the operator:
    // "a refine/retry is correct. not a hard throw... each rejection needs to
    // also give context on WHY it was rejected and HOW to properly improve").
    for (const w of v.warnings) {
      recordFailure({
        component: `${p.pair} ${p.day} ${p.direction}`,
        reason: 'GROUNDING_WARN',
        context: { check: w.check, token: w.token, sourceRef: w.sourceRef, value: w.value, proposed: w.proposed },
        attempts: n + 1,
        week: input.week,
        pair: p.pair,
      });
    }
    const exhausted = n >= MAX_REFINEMENTS;
    if (exhausted) {
      recordFailure({
        component: `${p.pair} ${p.day} ${p.direction}`,
        reason: 'REFINEMENT_EXHAUSTED',
        context: { warnings: v.warnings, projection: p, tokenLedger: p.tokenLedger },
        attempts: n + 1,
        week: input.week,
        pair: p.pair,
      });
      return { projection: p, valid: false, hardThrow: true, warnings: v.warnings };
    }
    p = refineProjection(p, v.warnings, ctx, input);
    p.tokenLedger = [
      ...p.tokenLedger,
      {
        token: 'validation',
        deterministic: false,
        llmRefined: false,
        verdict: `REFINED(${n + 1}): ${v.warnings.map((w) => w.check).join(', ')}`,
        evidence: v.warnings.map((w) => w.sourceRef),
      },
    ];
    n += 1;
  }
}

function chainContextFor(p: TradeProjection, input: ReasoningChainInput): ChainContext {
  return {
    pair: input.pair,
    week: input.week,
    anchorMs: input.anchorMs,
    tokens: p.tokenLedger,
    macroDirection: input.macro.direction,
    macroConsistent: true,
    divergences: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE TOKEN-RUN HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function runTokens1to7(ctx: TokenSetContext): TokenResult[] {
  const { operativeZone: zone, input } = ctx;
  const zoneForT1 = zone.type === 'DEMAND'
    ? (() => {
        const ph = phantomBoMExemption(zone, input.model, input.pip, input.atr1hPips);
        return ph.exempt ? { ...zone, phantom: true } : zone;
      })()
    : zone;
  const t1 = token1_zoneIdentification(zoneForT1);
  const t2 = token2_pressureStatus(zone);
  const t3 = token3_liquidity(input.lmvTable, zone);
  const t4 = token4_breakValidation(zone, input.model.narrative);
  const t5 = token5_strengthComparison(input.barsByTf['1H'] ?? []);
  const t6 = token6_reactionCount(zone);
  const t7 = token7_chainProgress(ctx.e2ChainDays, ctx.dayIndex);
  return [
    {
      token: 'zone-identification', deterministic: true,
      verdict: `${t1.classification} ${t1.deathRuleVerdict} on ${t1.zoneId}`,
      evidence: t1.evidence, confidence: t1.confidence,
    },
    {
      token: 'pressure-status', deterministic: true,
      verdict: `${t2.side} ${t2.lifecycle} score ${t2.score.toFixed(2)} mitigations ${t2.mitigationCount}${t2.fortress ? ' FORTRESS' : ''}`,
      evidence: [`lifecycle ${t2.lifecycle}`, `zfp ${zone.zfp}`, `pierced ${t2.pierced}`],
      confidence: t2.score,
    },
    {
      token: 'liquidity', deterministic: true,
      verdict: `nested ${t3.nestedRungs} below ${t3.liquidityBelow} above ${t3.liquidityAbove} nearest ${t3.nearestLqz ?? 'none'}`,
      evidence: [`internal rungs ${t3.nestedRungs}`, `shields ${t3.shieldRungs}`],
      confidence: Math.min(1, 0.4 + t3.nestedRungs * 0.1),
    },
    {
      token: 'break-validation', deterministic: true,
      verdict: `${t4.breakVerdict}${t4.closeBeyond ? ' close-beyond' : ''}${t4.wickReclaim ? ' wick-reclaim' : ''}`,
      evidence: [`narrative post-break zone ${t4.narrativeRef ?? 'none'}`],
      confidence: t4.breakVerdict === 'INVALID' ? 0.2 : 0.8,
    },
    {
      token: 'strength-comparison', deterministic: true,
      verdict: `${t5.strongerSide} delta ${t5.delta.toFixed(2)} impulse ${Number.isFinite(t5.impulseRatio) ? t5.impulseRatio.toFixed(2) : 'INF'}`,
      evidence: [`aggregate 1H range split over ${(input.barsByTf['1H'] ?? []).length} bars`],
      confidence: Math.min(1, 0.3 + t5.delta),
    },
    {
      token: 'reaction-count', deterministic: true,
      verdict: `mitigations ${t6}`,
      evidence: [`the 'third mitigation' doctrine: ${t6 >= 3 ? 'DEPLETED (TP-target-only)' : t6 === 0 ? 'VIRGIN' : 'ACTIVE'}`],
      confidence: Math.min(1, Math.max(0, 1 - t6 * 0.25)),
    },
    {
      token: 'chain-progress', deterministic: true,
      verdict: `${t7.chainStage} day ${ctx.dayIndex + 1}/${ctx.e2ChainDays.length}`,
      evidence: [`chain direction ${t7.chainDirection ?? 'unknown'}`, `days remaining ${t7.daysRemaining}`],
      confidence: Math.min(1, 0.3 + t7.chainProgress * 0.5),
    },
  ];
}

function computeConfidence(tokens17: TokenResult[], fp: ForwardProjectionOutput, anchors: AnchorOutput): number {
  const detAvg = tokens17.reduce((s, t) => s + (t.confidence ?? 0), 0) / Math.max(1, tokens17.length);
  const anchorConf = anchors.rrr > 0 ? Math.min(1, anchors.rrr / 5) : 0.3;
  let conf = 0.55 * detAvg + 0.25 * anchorConf + (fp.positionVerdict === 'FORWARD' ? 0.2 : 0.05);
  if (!anchors.llmRefined && !fp.llmRefined) conf = Math.min(conf, CONFIDENCE_DEGRADATION_CAP);
  return Math.min(1, Math.max(0, conf));
}

function buildTokenContext(
  input: ReasoningChainInput,
  e2Day: ShapeDayZone,
  zone: OperativeZone,
  direction: Direction,
  priorTp: number | undefined,
  dayIndex: number,
  dayKey: string,
  shape: string,
  dayOpenSpot: number,
  tokens17: TokenResult[],
): TokenSetContext {
  return {
    input,
    e2Day,
    operativeZone: zone,
    direction,
    dayIndex,
    dayKey,
    shape,
    dayOpenSpot,
    priorTp,
    e2ChainDays: (input.e2Days?.days ?? []).map((d) => ({ day: d.day, shape: d.shape, direction: d.direction, confidence: d.confidence })),
    widthRatio: input.atr1hPips > 0 ? (zone.ceiling - zone.floor) / input.pip / input.atr1hPips : 0,
    tokens: tokens17,
  };
}

function assembleProjection(
  ctx: TokenSetContext,
  tokens17: TokenResult[],
  fp: ForwardProjectionOutput,
  anchors: AnchorOutput,
  chainedEntry: number,
): TradeProjection {
  const { input, operativeZone: zone, direction, dayKey, shape, dayIndex, e2ChainDays } = ctx;
  const e2ProjectionId = e2ProjectionIdFor(ctx);
  const pressure = token2_pressureStatus(zone);
  const chainPos = token7_chainProgress(e2ChainDays, dayIndex);
  const confidence = computeConfidence(tokens17, fp, anchors);
  const fpToken: TokenResult = {
    token: 'forward-position', deterministic: true, llmRefined: fp.llmRefined,
    verdict: `${fp.positionVerdict} @ ${fp.forwardPosition.toFixed(5)} target ${fp.chosenTarget.toFixed(5)}`,
    evidence: fp.reasonTrace,
    confidence: fp.positionVerdict === 'FORWARD' ? 0.8 : 0.4,
  };
  const chainToken: TokenResult = {
    token: 'chaining', deterministic: true,
    verdict: chainedEntry > 0 ? `chained E = prior TP ${chainedEntry.toFixed(5)}` : "no prior TP (the day's first projection)",
    evidence: ['Law 27: the TP of N = the entry of N+1'],
    confidence: chainedEntry > 0 ? 0.9 : 0.5,
  };
  const anchorToken: TokenResult = {
    token: 'anchors', deterministic: true, llmRefined: anchors.llmRefined,
    verdict: `E ${anchors.entry.toFixed(5)} SL ${anchors.sl.toFixed(5)} TP ${anchors.tp.toFixed(5)} RRR ${anchors.rrr.toFixed(2)}`,
    evidence: anchors.anchors.map((a) => `${a.role}:${a.method}@${a.price.toFixed(5)}`),
    confidence: Math.min(1, anchors.rrr / 5),
  };
  const tokenLedger = [...tokens17, fpToken, chainToken, anchorToken];
  return {
    pair: input.pair,
    day: dayKey,
    shape,
    direction,
    entryZoneId: zone.id,
    entryLqzId: anchors.entryRungId,
    E: anchors.entry,
    SL: anchors.sl,
    TP: anchors.tp,
    RRR: anchors.rrr,
    pressureRead: pressure,
    chainContext: `shape-chain ${chainPos.chainStage} day ${dayIndex + 1}/${e2ChainDays.length}${chainPos.chainDirection ? ` ${chainPos.chainDirection}` : ''}`,
    validation: { valid: false, warnings: [], confidence },
    confidence,
    source: 'NATIVE',
    e2ProjectionId,
    e2DayDirection: ctx.e2Day.direction,
    setupId: `${input.pair}|${dayKey}|${shape}|${direction}|${zone.id}`,
    anchors: anchors.anchors,
    tokenLedger,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE UNIFIED MACRO AUTHORITY (the L1 §10 — the mirror + the cascade laws)
// ═══════════════════════════════════════════════════════════════════════════

function forwardDirectionFromPressure(model: ChartModel, e2Day: ShapeDayZone | undefined, pip: number): Direction {
  if (!e2Day) return 'LONG';
  const supply = resolveOperativeZone(model, model.pair, e2Day.supplyZoneId ?? undefined);
  const demand = resolveOperativeZone(model, model.pair, e2Day.demandZoneId ?? undefined);
  const atr = proxyAtr1hPips(model, pip);
  let demandScore = demand ? zonePressureScore(demand) : 0;
  if (demand) {
    const ph = phantomBoMExemption(demand, model, pip, atr);
    if (ph.exempt) demandScore += 25; // the fortress boost (the reaction wins)
  }
  const supplyScore = supply ? zonePressureScore(supply) : 0;
  const longWins = demandScore > supplyScore;
  return longWins ? 'LONG' : 'SHORT';
}

export function buildMacroAuthority(
  models: Record<PairKey, ChartModel>,
  e2: { dxyChain?: CascadedShapeChain | null; euCoreChain?: CascadedShapeChain | null; guCoreChain?: CascadedShapeChain | null },
  pip: Record<PairKey, number>,
): MacroAuthority {
  // THE UNIFIED MACRO AUTHORITY (the L1 §10): the DXY E2 chain is the SOURCE
  // (the operator's mirror + cascade laws — "unified macro signal has
  // authority"). EU is the 1:1 INVERTED mirror; GU cascades (same direction).
  const dxyMonday = e2.dxyChain?.days?.[0];
  let dxyDir: Direction;
  if (dxyMonday?.direction === 'LONG' || dxyMonday?.direction === 'SHORT') {
    dxyDir = dxyMonday.direction;
  } else {
    // The pressure fallback when the DXY chain is absent: the EU forward
    // reaction (the demand vs the supply, the fortress boost) — then inverted.
    const euFallback = forwardDirectionFromPressure(models['EUR/USD'], e2.euCoreChain?.days?.[0], pip['EUR/USD']);
    dxyDir = euFallback === 'LONG' ? 'SHORT' : 'LONG';
  }
  const euDir: Direction = dxyDir === 'LONG' ? 'SHORT' : 'LONG'; // the 1:1 inverted mirror
  const guDir = euDir; // the GU cascade law: GU direction == EU direction
  return {
    DXY: { direction: dxyDir, mirrorPair: 'EUR/USD', inverted: true, source: `the DXY E2 chain Monday ${dxyDir} (the source)` },
    'EUR/USD': { direction: euDir, mirrorPair: 'DXY', inverted: true, source: `the DXY ${dxyDir} inverted (the mirror law)` },
    'GBP/USD': { direction: guDir, mirrorPair: 'EUR/USD', inverted: false, source: `the EU ${euDir} kept (the GU cascade law)` },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * buildReasoningChain — run the 11-token sequence over the pair's E2 days
 * (Monday preferred), emit the macro-aligned forward projections + the
 * E2-native leg projections, validate/refine/retry each BEFORE the E3, record
 * the divergences + the hard-throw failures, and synthesize the run.
 */
export async function buildReasoningChain(input: ReasoningChainInput): Promise<ReasoningChainResult> {
  const { pair, week, anchorMs, model, macro } = input;
  const projections: TradeProjection[] = [];
  const failures: ChainFailure[] = [];
  const divergences: string[] = [];
  let llmTokens = 0;
  let refinements = 0;
  let hardThrows = 0;

  const days = input.e2Days?.days ?? [];
  const dayKeys = input.days && input.days.length > 0 ? input.days : ['Monday'];
  const matched = days.filter((d) => dayKeys.some((k) => d.day.toLowerCase().startsWith(k.toLowerCase().slice(0, 3))));
  const processDays = matched.length > 0 ? matched : days;

  for (const e2Day of processDays) {
    if (process.env.C2_DEBUG) console.log(`[C2-LOOP] ${pair} ${e2Day.day} dir=${e2Day.direction} KT=${(e2Day as { keyZoneType?: string }).keyZoneType ?? 'null'} S=${e2Day.supplyZoneId ?? 'null'} D=${e2Day.demandZoneId ?? 'null'} DD=${e2Day.deepDemandZoneId ?? 'null'} open=${e2Day.dayOpenSpot}`);
    const dayIndex = e2Day.dayIdx;
    const dayKey = e2Day.day;
    const shape = e2Day.shape;
    const dayDir = e2Day.direction;
    const dayOpenSpot = e2Day.dayOpenSpot ?? model.spot;

    const supplyRaw = resolveOperativeZone(model, pair, e2Day.supplyZoneId ?? undefined);
    const supply = supplyRaw
      ?? strongestSupplyInDayBand(model, dayOpenSpot, input.anchorMs);
    if (process.env.C2_DEBUG) console.log(`[C2-SUPPLY] ${pair} ${dayKey} id=${e2Day.supplyZoneId ?? 'null'} -> ${supply ? supply.id + ' [' + supply.floor.toFixed(5) + ',' + supply.ceiling.toFixed(5) + ']' : 'NULL'}`);   // THE D-3a fallback (the W8B §7): the E2's SS-day
                                                  // designation dropped the EU Monday's supply side →
                                                  // the SHORT lane resolves the day's structural supply
                                                  // (the Friday supply 1.14460 — the operator's #1 —
                                                  // the recently-battled + the pressure selection)
    const demand = resolveOperativeZone(model, pair, e2Day.demandZoneId ?? undefined);
    const deepDemand = resolveOperativeZone(model, pair, e2Day.deepDemandZoneId ?? undefined);
    // THE LONG lane's demand: the E2-designated demand FIRST (the C-2 fix —
    // 2026-08-11 — the E2-AUTHORITATIVE order: the ids are now POPULATED
    // (the E2-null dead — the C-1 wave), so the E2's designation MUST lead;
    // the phantom-BoM FORTRESS falls back AFTER the E2 demand (the pre-C-2
    // order ran the fortress search FIRST — the fallback overrode the E2's
    // D=LMV|DXY|100.95000 with the deeper [100.77] structure → the golden
    // DXY LONG 100.945 became a Δ13.0p MISS). The EU LONG's fortress is
    // UNCHANGED: the E2-designated demand there IS the fortress (D=1.14004)
    // — the E2-first order still emits it (G1 stays satisfiable). "The ADM
    // over the E2-designated zones — NO fallbacks as the primary path."
    const longDemand = demand ?? deepDemand ?? findFortressDemand(model, dayOpenSpot, input) ?? nearestDemandBelow(model, dayOpenSpot);
    if (process.env.C2_DEBUG) {
      console.log(`[C2-LANE] ${pair} ${dayKey} dayDir=${dayDir} e2D=${e2Day.demandZoneId ?? 'null'} demand=${demand ? demand.id + ' [' + demand.floor.toFixed(5) + ',' + demand.ceiling.toFixed(5) + ']' : 'NULL'} deep=${deepDemand ? deepDemand.id + ' [' + deepDemand.floor.toFixed(5) + ',' + deepDemand.ceiling.toFixed(5) + ']' : 'NULL'} longDemand=${longDemand ? longDemand.id + ' [' + longDemand.floor.toFixed(5) + ',' + longDemand.ceiling.toFixed(5) + ']' : 'NULL'} macro=${macro.direction}`);
    }

    // THE LANES: (1) the E2-native leg (the day direction), (2) the REACTION
    // lane (the complement — the operator's "the demand's pressure will react"
    // forward-reasoning; the fortress demand preferred for the LONG), (3) the
    // MACRO lane (the unified macro direction). THE ORDER (the D-3a fix — the
    // operator's golden): on the SS days the SHORT leg (#1) precedes the LONG
    // leg (#2 — chained at the #1's TP — the EU #1 1.14390 → #2 1.14110 = the
    // #1's TP — Law 27). The REACTION lane ranks BEFORE the MACRO so the
    // day's complement (the SHORT when the day is LONG) emits FIRST when the
    // E2-native leg is absent.
    const lanes: Array<{ direction: Direction; zone: OperativeZone | null; lane: 'E2_NATIVE' | 'MACRO' | 'REACTION' }> = [];
    if (dayDir === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'E2_NATIVE' });
    if (dayDir === 'LONG' && (demand ?? deepDemand)) lanes.push({ direction: 'LONG', zone: demand ?? deepDemand, lane: 'E2_NATIVE' });
    const reactionDir: Direction = dayDir === 'SHORT' ? 'LONG' : 'SHORT';
    if (reactionDir === 'LONG' && longDemand) lanes.push({ direction: 'LONG', zone: longDemand, lane: 'REACTION' });
    if (reactionDir === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'REACTION' });
    if (macro.direction === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'MACRO' });
    if (macro.direction === 'LONG' && longDemand) lanes.push({ direction: 'LONG', zone: longDemand, lane: 'MACRO' });

    // Dedupe by direction, keeping the FIRST occurrence (the E2-native leg
    // first so its TP chains into the reaction — the TP-of-N = entry-of-N+1).
    const rank: Record<'E2_NATIVE' | 'MACRO' | 'REACTION', number> = { E2_NATIVE: 0, REACTION: 1, MACRO: 2 };
    const unique = new Map<Direction, (typeof lanes)[number]>();
    for (const l of lanes) if (l.zone && !unique.has(l.direction)) unique.set(l.direction, l);
    const ordered = [...unique.values()].sort((a, b) => rank[a.lane] - rank[b.lane]);

    let priorTp: number | undefined;
    for (const lane of ordered) {
      let zone = lane.zone as OperativeZone;
      // THE RECEIVING-STRUCTURE RE-RESOLUTION (the DEFECT-N fix — 2026-08-11,
      // the DXY LONG lane): when a chained entry exists (the prior lane's TP)
      // and the lane's selected zone does NOT contain it, the zone is the
      // WRONG receiving structure — the operator's chaining law VERBATIM: "the
      // operator's chaining levels ALWAYS land INSIDE the receiving structure".
      // The DXY LONG: the E2 demand [101.005-101.045] does NOT contain the
      // SHORT's TP 100.918 → re-resolve to the receiving demand [100.86-100.94]
      // → the chained clamp 100.918 → Δ2.7p vs the operator's golden 100.945
      // (the W8B-precedented HIT; the pre-fix band midpoint 101.025 was an
      // 8.0p MISS that lost on the real bars). The gate is the CONTAINMENT —
      // a zone that ALREADY contains the chained TP (the EU LONG's fortress
      // [1.14004-1.14147] vs the chained 1.14040) is NEVER re-resolved — the
      // EU/GU lanes stay byte-identical. A null receiving demand keeps the
      // original selection (the honest absence — the D3 law).
      if (lane.direction === 'LONG' && priorTp !== undefined && priorTp > 0 &&
          !(zone.floor <= priorTp + 1e-9 && zone.ceiling >= priorTp - 1e-9)) {
        const receiving = receivingDemandForChained(model, priorTp);
        if (receiving) {
          lane.zone = receiving;
          zone = receiving;
        }
      }
      const tokens17 = runTokens1to7(
        buildTokenContext(input, e2Day, zone, lane.direction, priorTp, dayIndex, dayKey, shape, dayOpenSpot, []),
      );
      const ctx = buildTokenContext(input, e2Day, zone, lane.direction, priorTp, dayIndex, dayKey, shape, dayOpenSpot, tokens17);
      // THE C1 PARALLEL PAIR (the L2 spec PART 2.4 — the operator's ruling:
      // "8, 9, and 10 can all run async in parallel... 11 can come after these
      // are done and assembled"). token9 (chaining) is sync — the lane-level
      // chain value. token8 (forward-position) and token10 (anchor) are
      // INDEPENDENT LLM calls: token10's deterministic skeleton needs ONLY the
      // deterministic fp (computed BEFORE the dispatch) — the LLM refines both
      // concurrently. token11 (runRefineRetry) validates AFTER the assembly.
      const chainedEntry = token9_chaining(priorTp);
      const targets = continuationTargetsFor(input.model, zone, lane.direction);
      const deterministicFp = deterministicForwardPosition(ctx, targets);
      const [fp, anchorsOut] = await Promise.all([
        token8_forwardPosition(ctx),
        token10_anchorConstruction(ctx, deterministicFp, chainedEntry),
      ]);
      // THE D3 LAW (the A2 test): a null anchor floor (NO structural TP) → the
      // lane emits NOTHING — the trade does not exist. Never a fabricated
      // 2.5-RRR clamp. The lane is skipped; the chained TP stays unset.
      if (anchorsOut === null) {
        recordFailure({
          component: `${pair} ${dayKey} ${lane.direction}`,
          reason: 'GROUNDING_WARN',
          context: {
            check: 'NO_STRUCTURAL_TP',
            sourceRef: 'reasoning-chain:deterministicAnchors',
            value: { direction: lane.direction, zone: zone.id, targets },
            proposed: 'no opposing structural target resolves — the trade does not exist (the RRR is a consequence, never a target)',
          },
          attempts: 1,
          week,
          pair,
        });
        continue;
      }
      const proj = assembleProjection(ctx, tokens17, fp, anchorsOut, chainedEntry);
      const { projection, valid, hardThrow, warnings } = await runRefineRetry(proj, input, ctx);
      if (hardThrow) {
        hardThrows += 1;
        failures.push({
          pipelineStage: 'E3',
          failureType: 'REFINEMENT_EXHAUSTED',
          pair,
          setupId: proj.setupId,
          warnings,
          projection,
          nextSteps: [
            `Refine the operative-zone selection for ${pair} ${dayKey} ${lane.direction}`,
            'Rerun the reasoning chain: bun diag-reasoning-chain.ts',
          ],
        });
        continue;
      }
      priorTp = projection.TP;
      llmTokens += projection.tokenLedger.filter((t) => t.llmRefined).length;
      refinements += projection.tokenLedger.filter((t) => t.verdict.startsWith('REFINED')).length;
      // THE DIVERGENCE LAW (the L1 §10.2): a per-pair REVERSAL classification
      // (the R-shape day) that contradicts the unified macro direction is a
      // divergence BUG — recorded, never suppressed; the macro wins the
      // emission. The SS days emit both sides natively (the operator's goldens).
      if (lane.lane === 'E2_NATIVE' && lane.direction !== macro.direction && shape === 'R') {
        const d = `${pair} ${dayKey}: E2-native ${lane.direction} (${shape}) vs the unified macro ${macro.direction} — the macro wins the emission; the divergence recorded, never suppressed`;
        divergences.push(d);
        recordFailure({
          component: `${pair} ${dayKey} ${lane.direction}`,
          reason: 'MACRO_DIVERGENCE',
          context: { divergence: d, e2Day: { day: dayKey, shape, direction: dayDir }, projection },
          attempts: 1,
          week,
          pair,
        });
      }
      projections.push(projection);
    }
  }

  const ledger: ChainContext = {
    pair,
    week,
    anchorMs,
    tokens: projections.flatMap((p) => p.tokenLedger),
    macroDirection: macro.direction,
    macroConsistent: divergences.length === 0,
    divergences,
  };
  return {
    projections,
    ledger,
    failures,
    stats: { deterministicTokens: projections.length * 7, llmTokens, refinements, hardThrows },
  };
}
