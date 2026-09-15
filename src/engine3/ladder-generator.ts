/**
 * Engine 3 (3D) — Liquidity Ladder Module (Phase 6, V4.3)
 *
 * Per PLUTUS_V4.3_BUILD_SPEC.md §10 + PLUTUS_ANCHOR_DOCTRINE.md §6
 * (The Ladder Doctrine — ticketed 16-61x combined-RRR architecture):
 *
 *   Primary entry at a BoM/LQZ rung carries the ONLY risk in the entire
 *   structure (50% size, SL 5-15 pips). Rockets at successive MoM rungs
 *   20-30 pips apart (30%, 20% sizes). Single shared TP at the opposing
 *   BoM / 4H liquidity pool.
 *
 *   BE CASCADE: rocket 1 fills → primary SL to breakeven (risk = 0);
 *   rocket 2 fills → rocket 1 SL to breakeven (locking profit).
 *   Combined R:R = total reward ÷ primary risk ONLY.
 *   Ticketed values: 6.8, 7.0, 7.29, 7.51, 10.0, 11.06, 16, 17.44, 57, 61.
 *
 * PRECONDITIONS (Bible 5.12 + virgin-MoM exception):
 *   - Parent must be BS-family (BS/PBS — sustained directional move).
 *     WL parents are FORBIDDEN: WL's isolated energy cannot guarantee
 *     piercing; the pattern is unpredictable.
 *   - ≥2 MoM rung candidates between entry and the opposing BoM target.
 *   - Ladder entries are on the MoM rungs (or LQZ rungs anchored to MoM
 *     zones), NEVER on BoM (BoM is the primary or the target).
 */

import { Logger } from '../utils/logger.js';
import type { VisualSDZone } from './types.js';

const log = new Logger('LadderGenerator');

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Law 7 SL buffer per pair (pips) — mirrors SL_BUFFER_PIPS in
 * visual-setup-generator.ts (single-law duplication: this module must stay
 * import-cycle-free, so the table is restated rather than imported).
 */
const SL_BUFFER_PIPS: Record<string, number> = {
  'EUR/USD': 2, 'GBP/USD': 3, 'AUD/USD': 3, 'DXY': 5,
};

/** Fallback pip size when the caller passes no usable pipValue (major FX). */
const DEFAULT_PIP_VALUE = 0.0001;

/** Minimum spacing between successive rocket rungs (doctrine: 20-30 pips). */
const MIN_RUNG_SPACING_PIPS = 15;

/** Maximum rockets per ladder (doctrine: 30% / 20% sizes). */
const MAX_ROCKETS = 2;

/** Shapes that may parent a ladder — BS-family ONLY (Bible 5.12). */
const BS_FAMILY_SHAPES: ReadonlySet<string> = new Set(['BS', 'PBS']);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LadderRung {
  kind: 'primary' | 'rocket';
  entry: number;
  sl: number;
  tp: number;             // shared across all rungs
  sizePct: number;        // 50 / 30 / 20
  riskPips: number;       // primary: 5-15; rockets: small (but cascade covers)
  zoneName: string;
  beTrigger?: { onFillMoveSlOf: 'primary' | 'rocket1'; to: number };  // BE cascade
}

export interface LadderStructure {
  parentSetupId: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  rungs: LadderRung[];
  sharedTP: number;
  combinedRrr: number;    // total reward ÷ primary risk
  shape: string;          // parent shape (must be BS-family)
}

/** Minimal parent view — anything with these fields can parent a ladder. */
export interface LadderParentSetup {
  setupId: string;
  pair: string;
  direction: string;      // 'LONG' | 'SHORT' (TradeDirection enum is string-valued)
  entry: number;
  sl: number;
  tp: number;
  shape: string;          // ShapeCode value as string ('BS', 'PBS', ...)
  category?: string;
  zoneName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * generateLiquidityLadder — build the 16-61x combined-RRR ladder for a
 * BS-family parent setup, or null (with a logged reason) when any
 * precondition fails.
 *
 * @param parentSetup Parent trade setup (BS/PBS shape only).
 * @param allZones    Full visual-zone pool for the pair (MoM rungs sourced here).
 * @param pipValue    Pip size in price units (DXY 0.01, majors 0.0001).
 */
export function generateLiquidityLadder(
  parentSetup: LadderParentSetup,
  allZones: VisualSDZone[],
  pipValue: number,
): LadderStructure | null {
  const parent = parentSetup ?? ({} as LadderParentSetup);
  const pair = String(parent.pair ?? '');
  const shape = String(parent.shape ?? '').toUpperCase();
  const entry = Number(parent.entry ?? NaN);
  const sl = Number(parent.sl ?? NaN);
  const tp = Number(parent.tp ?? NaN);
  const pv = pipValue && pipValue > 0 ? pipValue : DEFAULT_PIP_VALUE;
  const tag = `[ladder] ${pair} ${parent.setupId ?? '?'}`;

  // ── Precondition 1: BS-family parent ONLY (Bible 5.12) ──
  if (!BS_FAMILY_SHAPES.has(shape)) {
    log.info(`${tag}: rejected — parent shape '${shape || '?'}' is not BS-family (BS/PBS only; WL/RWL/WLS/SS/R forbidden)`);
    return null;
  }

  // ── Precondition 2: valid geometry ──
  const dirRaw = String(parent.direction ?? '').toUpperCase();
  if (dirRaw !== 'LONG' && dirRaw !== 'SHORT') {
    log.info(`${tag}: rejected — invalid direction '${parent.direction ?? '?'}'`);
    return null;
  }
  const direction = dirRaw as 'LONG' | 'SHORT';
  if (!Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(tp)) {
    log.info(`${tag}: rejected — non-finite entry/sl/tp (${parent.entry}/${parent.sl}/${parent.tp})`);
    return null;
  }
  if (direction === 'LONG' && tp <= entry) {
    log.info(`${tag}: rejected — LONG tp ${tp} not above entry ${entry}`);
    return null;
  }
  if (direction === 'SHORT' && tp >= entry) {
    log.info(`${tag}: rejected — SHORT tp ${tp} not below entry ${entry}`);
    return null;
  }
  const primaryRiskPips = Math.abs(entry - sl) / pv;
  if (primaryRiskPips <= 0) {
    log.info(`${tag}: rejected — zero primary risk (entry == sl at ${entry})`);
    return null;
  }

  // ── Rung candidates: MoM zones (or LQZ rungs anchored to MoM zones) ──
  // BoM zones are EXCLUDED — BoM is the primary or the target, never a rocket.
  const bufferPips = SL_BUFFER_PIPS[pair] ?? 3;
  const bufferPrice = bufferPips * pv;

  interface Candidate { entry: number; sl: number; riskPips: number; zoneName: string; }
  const candidates: Candidate[] = [];

  for (const z of allZones ?? []) {
    if (!z) continue;
    if (String(z.pair ?? '') !== pair) continue;
    if (String(z.classification ?? '') !== 'MoM') continue;   // BoM/BOSM/UNMITIGATED excluded
    const top = Number(z.top ?? NaN);
    const bottom = Number(z.bottom ?? NaN);
    if (!Number.isFinite(top) || !Number.isFinite(bottom)) continue;

    // Entry at the rung's NEAR edge (toward TP direction); SL at the FAR
    // edge ∓ pair buffer (Law 7 — same buffers as the main generator).
    const rEntry = direction === 'SHORT' ? bottom : top;
    const rSl = direction === 'SHORT' ? top + bufferPrice : bottom - bufferPrice;

    // Strictly between parent entry and the shared TP.
    const between = direction === 'SHORT'
      ? (rEntry < entry && rEntry > tp)
      : (rEntry > entry && rEntry < tp);
    if (!between) continue;

    candidates.push({
      entry: rEntry,
      sl: rSl,
      riskPips: Math.abs(rEntry - rSl) / pv,
      zoneName: String(z.mappedIPZoneName ?? z.ipZoneRef ?? 'MoM'),
    });
  }

  // Sort by distance from parent entry (nearest MoM rung fills first).
  candidates.sort((a, b) =>
    Math.abs(a.entry - entry) - Math.abs(b.entry - entry));

  // Enforce ≥15-pip spacing between successive ROCKET rungs (doctrine:
  // 20-30 pips). The primary↔rocket-1 gap is NOT spacing-gated — rocket 1
  // triggers as soon as price leaves the primary rung.
  const spaced: Candidate[] = [];
  for (const c of candidates) {
    const prev = spaced[spaced.length - 1];
    if (prev && (Math.abs(c.entry - prev.entry) / pv) < MIN_RUNG_SPACING_PIPS) continue;
    spaced.push(c);
  }

  // ── Precondition 3: ≥2 MoM rung candidates between entry and target ──
  if (spaced.length < 2) {
    log.info(`${tag}: rejected — ${spaced.length} MoM rung(s) between entry ${entry} and tp ${tp} (need ≥2)`);
    return null;
  }

  // ── Primary rung: parent's entry/SL/TP, 50% size — the ONLY risk ──
  const primary: LadderRung = {
    kind: 'primary',
    entry,
    sl,
    tp,
    sizePct: 50,
    riskPips: primaryRiskPips,
    zoneName: String(parent.zoneName ?? 'PRIMARY'),
  };

  // ── Rockets (max 2): 30% / 20% sizes + BE cascade ──
  const sizes = [30, 20];
  const rockets: LadderRung[] = spaced.slice(0, MAX_ROCKETS).map((c, i) => {
    const rung: LadderRung = {
      kind: 'rocket',
      entry: c.entry,
      sl: c.sl,
      tp,
      sizePct: sizes[i] ?? 20,
      riskPips: c.riskPips,
      zoneName: c.zoneName,
    };
    // BE cascade: rocket 1 fills → primary SL to breakeven (risk = 0);
    // rocket 2 fills → rocket 1 SL to breakeven (locking profit).
    if (i === 0) {
      rung.beTrigger = { onFillMoveSlOf: 'primary', to: entry };
    } else {
      const r1 = spaced[0]!;
      rung.beTrigger = { onFillMoveSlOf: 'rocket1', to: r1.entry };
    }
    return rung;
  });

  const rungs: LadderRung[] = [primary, ...rockets];

  // ── Combined R:R = Σ(|tp − rung.entry| × sizePct-fraction) ÷ primary risk ──
  const weightedRewardPips = rungs.reduce(
    (sum, r) => sum + (Math.abs(tp - r.entry) / pv) * (r.sizePct / 100), 0);
  const combinedRrr = weightedRewardPips / primaryRiskPips;

  log.info(
    `${tag}: ${direction} ${shape} ladder armed — ${rungs.length} rungs ` +
    `(primary ${entry} risk ${primaryRiskPips.toFixed(1)}p + ${rockets.length} rockets), ` +
    `shared TP ${tp}, combined ${combinedRrr.toFixed(2)}x, BE cascade armed`,
  );

  return {
    parentSetupId: String(parent.setupId ?? ''),
    pair,
    direction,
    rungs,
    sharedTP: tp,
    combinedRrr,
    shape,
  };
}
