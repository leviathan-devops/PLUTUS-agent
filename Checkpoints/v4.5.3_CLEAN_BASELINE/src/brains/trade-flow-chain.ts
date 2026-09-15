/**
 * Trade Flow Continuity (TTE v5.3.3 — Section 7.4: Trade Flow Continuity Protocol)
 *
 * Trade setups are chained into continuous flow sequences. The TP of Trade N
 * becomes the entry zone of Trade N+1. This creates a seamless flow:
 *
 *     LONG from support → TP at resistance → SHORT from resistance →
 *     TP at support → repeat.
 *
 * SPEC RULES (Trident_System_Prompt_v5.3.3 §7.4):
 *   1. Only chain setups that share a structural boundary
 *      (the TP zone of one is the entry zone of the next).
 *   2. The direction FLIPS at each zone boundary
 *      (LONG→SHORT at resistance, SHORT→LONG at support).
 *   3. Each trade in the chain must independently meet the minimum RRR
 *      threshold (supplementary chained setups use CHAIN_MIN_RRR_SUPPLEMENTARY).
 *   4. Chain length: maximum 3 trades per chain. After 3, reassess the macro.
 *   5. If a zone fails (breakout / SL hit), the chain terminates and a new
 *      chain begins in the breakout direction.
 *
 * NOTE ON DIRECTION: the spec mandates a direction FLIP at each boundary —
 * the new setup must be OPPOSITE in direction to the last trade in the chain.
 * This module enforces the flip; it does NOT chain same-direction setups.
 */

import { TradeDirection, type TradeSetup } from '../types.js';
import {
  MAX_TRADES_PER_CHAIN,
  CHAIN_ENTRY_TOLERANCE_PCT,
  CHAIN_MIN_RRR_SUPPLEMENTARY,
} from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A trade flow chain — a sequence of setups where each link's entry is the
 * prior link's TP, with direction flipping at every boundary.
 *
 * - 'active':    chain is open for additional continuation links.
 * - 'completed': chain reached MAX_TRADES_PER_CHAIN and the final TP hit.
 * - 'broken':    a zone failed (SL hit) — the chain is dead; a new chain
 *                begins in the breakout direction.
 */
export interface TradeFlowChain {
  chainId: string;
  pair: string;
  direction: TradeDirection; // direction of the FIRST (origin) setup
  setups: TradeSetup[];
  status: 'active' | 'completed' | 'broken';
  startedAt: number;
  completedAt?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let chainCounter = 0;

/** Generate a unique, monotonic chain id. */
function nextChainId(): string {
  chainCounter += 1;
  return `tfc-${chainCounter}-${Date.now().toString(36)}`;
}

/** The last setup appended to the chain (the active "tip"). */
function lastSetup(chain: TradeFlowChain): TradeSetup | undefined {
  return chain.setups.length > 0
    ? chain.setups[chain.setups.length - 1]
    : undefined;
}

/**
 * Is `direction` the structural flip of `prior` at a zone boundary?
 * LONG↔SHORT flip. NEUTRAL never participates in a chain link.
 */
function isDirectionFlip(prior: TradeDirection, next: TradeDirection): boolean {
  if (next === TradeDirection.NEUTRAL || prior === TradeDirection.NEUTRAL) {
    return false;
  }
  return prior !== next;
}

/**
 * Is `entry` within `tolerancePct` (relative) of `tp`?
 * Guarded against a zero reference price.
 */
function entryNearTp(entry: number, tp: number, tolerancePct: number): boolean {
  if (!Number.isFinite(tp) || tp === 0) return false;
  return Math.abs(entry - tp) / Math.abs(tp) <= tolerancePct;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new trade flow chain from a standalone setup.
 *
 * The setup becomes the chain ORIGIN (position 1). Its own chainId /
 * chainPosition fields are populated on the returned setup reference.
 */
export function createChain(setup: TradeSetup): TradeFlowChain {
  const chainId = nextChainId();
  const origin: TradeSetup = {
    ...setup,
    chainId,
    chainPosition: 1,
  };
  return {
    chainId,
    pair: setup.pair,
    direction: setup.direction,
    setups: [origin],
    status: 'active',
    startedAt: Date.now(),
  };
}

/**
 * Detect whether a new setup's entry is near a prior chain's TP — i.e. whether
 * this setup is a valid CONTINUATION link for an existing active chain.
 *
 * A chain qualifies when ALL of the following hold (spec §7.4 rules 1-4):
 *   - the chain is 'active' and has room (< MAX_TRADES_PER_CHAIN setups),
 *   - the chain's pair matches the setup's pair,
 *   - the setup's entry is within `tolerancePct` of the last trade's TP, and
 *   - the setup's direction FLIPS the last trade's direction (rule 2).
 *
 * Returns the first matching chain, or null if no continuation is possible.
 * The caller is responsible for calling `appendChain` to actually link them.
 */
export function detectChainEntry(
  setup: TradeSetup,
  activeChains: TradeFlowChain[],
  tolerancePct: number = CHAIN_ENTRY_TOLERANCE_PCT,
): TradeFlowChain | null {
  for (const chain of activeChains) {
    // Rule 4: chain must be active and under the length cap.
    if (chain.status !== 'active') continue;
    if (chain.setups.length >= MAX_TRADES_PER_CHAIN) continue;

    // Rule 1 (pair match — continuation is same-pair by definition).
    if (chain.pair !== setup.pair) continue;

    const tip = lastSetup(chain);
    if (!tip) continue;

    // Rule 1 (structural boundary): entry near the prior TP.
    if (!entryNearTp(setup.entry, tip.tp, tolerancePct)) continue;

    // Rule 2: direction flips at each zone boundary.
    if (!isDirectionFlip(tip.direction, setup.direction)) continue;

    return chain;
  }
  return null;
}

/**
 * Append a setup to an existing chain, making it the new tip.
 *
 * Validates (spec §7.4 rules 1-4):
 *   - chain is 'active',
 *   - length < MAX_TRADES_PER_CHAIN,
 *   - same pair,
 *   - direction FLIPS the current tip (rule 2),
 *   - entry is near the current tip's TP (rule 1, within tolerancePct),
 *   - the setup independently meets the supplementary RRR floor (rule 3).
 *
 * The appended setup's chainId / chainPosition (1-indexed) are stamped.
 * Returns a NEW chain object (immutable update).
 *
 * If validation fails, the chain is returned unchanged so the caller can
 * fall back to `createChain` for a standalone origin.
 */
export function appendChain(
  chain: TradeFlowChain,
  setup: TradeSetup,
  tolerancePct: number = CHAIN_ENTRY_TOLERANCE_PCT,
): TradeFlowChain {
  // Guard: only append to active chains that still have room.
  if (chain.status !== 'active') {
    return chain;
  }
  if (chain.setups.length >= MAX_TRADES_PER_CHAIN) {
    return chain;
  }
  if (chain.pair !== setup.pair) {
    return chain;
  }

  const tip = lastSetup(chain);
  if (!tip) {
    return chain;
  }

  // Rule 2: direction must flip.
  if (!isDirectionFlip(tip.direction, setup.direction)) {
    return chain;
  }

  // Rule 1: entry near the prior TP.
  if (!entryNearTp(setup.entry, tip.tp, tolerancePct)) {
    return chain;
  }

  // Rule 3: each link independently meets the supplementary RRR floor.
  if (!Number.isFinite(setup.rrr) || setup.rrr < CHAIN_MIN_RRR_SUPPLEMENTARY) {
    return chain;
  }

  const linked: TradeSetup = {
    ...setup,
    chainId: chain.chainId,
    chainPosition: chain.setups.length + 1,
  };

  return {
    ...chain,
    setups: [...chain.setups, linked],
  };
}

/**
 * Update a chain's status after a trade closes.
 *
 * - 'tp': a TP hit opens the door for the next link. If the chain is already
 *         at MAX_TRADES_PER_CHAIN, the flow is complete (status 'completed').
 *         Otherwise the chain stays 'active' so the next continuation can link.
 * - 'sl': a zone failed / breakout (spec rule 5). The chain is 'broken' and a
 *         new chain should begin in the breakout direction.
 *
 * Returns a NEW chain object (immutable update).
 */
export function updateChainStatus(
  chain: TradeFlowChain,
  hitType: 'tp' | 'sl',
): TradeFlowChain {
  if (hitType === 'sl') {
    return {
      ...chain,
      status: 'broken',
      completedAt: Date.now(),
    };
  }

  // hitType === 'tp'
  if (chain.setups.length >= MAX_TRADES_PER_CHAIN) {
    return {
      ...chain,
      status: 'completed',
      completedAt: Date.now(),
    };
  }

  // TP hit but chain still has room — stays active for the next link.
  return chain;
}

/** Convenience: the next chain position that would be assigned (1-indexed). */
export function nextChainPosition(chain: TradeFlowChain): number {
  return chain.setups.length + 1;
}

export { MAX_TRADES_PER_CHAIN, CHAIN_ENTRY_TOLERANCE_PCT };
