/**
 * RRR Scoring Rules — RRR-1 through RRR-6
 *
 * Risk-to-Reward ratio overlay rules that complement the firewall's existing CS8
 * (SL cap) and minimum RRR-by-tier checks.
 *
 * RRR-1 (minimum RRR by category) is a HARD_BLOCK — trades below the
 * category-specific RRR minimum are rejected. RRR-2 through RRR-6 remain
 * advisory checks that flag suboptimal configurations.
 *
 * RRR rules operate on setup-level data and optional TimesFM probability
 * assessments when available.
 */

import { SetupCategory, GuardrailResult, PIP_VALUE } from '../types.js';
import { RuleCheckContext } from './index.js';
import {
  rrrForCategory,
  MAX_RISK_PER_TRADE_PCT,
  MIN_TP_ATR_MULTIPLE as MIN_TP_ATR_RATIO,
  MAX_SL_ATR_MULTIPLE as MAX_SL_ATR_RATIO,
  LOW_PROB_PTP_THRESHOLD as PTP_THRESHOLD,
  MIN_RRR_FOR_LOW_PROB as MIN_RRR_LOW_PROBABILITY,
  LARGE_SL_WARNING_PIPS, PIP_VALUE_DEFAULT, PCT_MULTIPLIER,
} from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimum RRR by setup category — DERIVED from rrrForCategory()
 * (trading-constants RRR_BY_CATEGORY, the single source of truth).
 * The generator and pipeline resolve the same minimums, so no producer
 * emits a setup this rule will reject.
 *
 * setup.rrr is the TP1 (primary target) RRR, so the tp1 minimum applies.
 */
export const MIN_RRR_BY_CATEGORY: Record<SetupCategory, number> = {
  [SetupCategory.HTF_SWING]: rrrForCategory(SetupCategory.HTF_SWING).tp1,
  [SetupCategory.SWING_SCALP]: rrrForCategory(SetupCategory.SWING_SCALP).tp1,
  [SetupCategory.BREAKOUT_SURGE]: rrrForCategory(SetupCategory.BREAKOUT_SURGE).tp1,
  [SetupCategory.REINFORCEMENT]: rrrForCategory(SetupCategory.REINFORCEMENT).tp1,
  [SetupCategory.TRANSITION]: rrrForCategory(SetupCategory.TRANSITION).tp1,
  [SetupCategory.WHIPLASH]: rrrForCategory(SetupCategory.WHIPLASH).tp1,
};

/** Re-exported from trading-constants for backward compatibility. */
export { MAX_RISK_PER_TRADE_PCT };

/** Re-exported alias for backward compatibility. */
export { MIN_TP_ATR_RATIO };

/** Re-exported alias for backward compatibility. */
export { MAX_SL_ATR_RATIO };

/** Re-exported alias for backward compatibility. */
export { PTP_THRESHOLD };

/** Re-exported alias for backward compatibility. */
export { MIN_RRR_LOW_PROBABILITY };

// ═══════════════════════════════════════════════════════════════════════════════
// PIP VALUE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getPipValue(pair: string): number {
  return PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * RRR-1: Minimum RRR by category (HARD_BLOCK)
 *
 * Each setup category has a minimum TP1 RRR (from RRR_BY_CATEGORY,
 * the unified source of truth shared with the generator and pipeline):
 *   - HTF Swing      >= 3.0
 *   - Swing Scalp    >= 3.0
 *   - Breakout Surge >= 3.0
 *   - Reinforcement  >= 3.0
 *   - Transition     >= 3.0
 *   - Whiplash       >= 3.0
 *
 * OPERATOR RULING (2026-07-31): "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE
 * IDK WHERE THE FUCK THIS SLOP CAME FROM ALL MY TRADES ARE 4+ SO 3 IS THE
 * MINNIMUM" — and the executed standard: "NOT A SINGLE ONE OF MY TRADES IS
 * BELOW RRR = 3.5". A setup under 3.0 is slop; every category floor is 3.0.
 *
 * This rule HARD_BLOCKS any setup that falls below its category minimum.
 * The setup is rejected entirely — the trader must adjust TP/entry/SL.
 */
export function rrr1MinRRRByCategory(ctx: RuleCheckContext): GuardrailResult {
  const category = ctx.setup.category as SetupCategory;

  // Unknown categories keep legacy pass-through semantics (no minimum defined).
  if (!(category in MIN_RRR_BY_CATEGORY)) {
    return {
      rule: 'RRR-1',
      passed: true,
      severity: 'INFO',
      message: `No RRR minimum defined for category ${category}`,
    evidence: `RRR-1 check passed: No RRR minimum defined for category ${category}`,
    };
  }

  // Unified minimum — identical to the generator/pipeline threshold.
  const { tp1: minRRR } = rrrForCategory(String(category));

  if (ctx.setup.rrr < minRRR) {
    return {
      rule: 'RRR-1',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `RRR ${ctx.setup.rrr} < ${minRRR} minimum for ${category} — setup REJECTED (below spec threshold)`,
    evidence: `RRR-1 check failed: RRR ${ctx.setup.rrr} < ${minRRR} minimum for ${category} — setup REJECTED (below spec threshold)`,
    };
  }

  return {
    rule: 'RRR-1',
    passed: true,
    severity: 'INFO',
    message: `RRR ${ctx.setup.rrr} ≥ ${minRRR} for ${category}`,
  evidence: `RRR-1 check passed: RRR ${ctx.setup.rrr} ≥ ${minRRR} for ${category}`,
  };
}

/**
 * RRR-2: Risk-adjusted position sizing
 *
 * Position size must not risk more than 1% of account per trade.
 * This checks that the setup's SL pips × position size ≤ 1% of account.
 *
 * Note: Exact position size is determined by the position manager.
 * This rule verifies that the setup-level risk is within bounds.
 */
export function rrr2RiskAdjustedPositionSizing(ctx: RuleCheckContext): GuardrailResult {
  const accountBalance = ctx.accountBalance;
  const positionSizePct = ctx.positionSizePct;

  if (accountBalance === undefined && positionSizePct === undefined) {
    // If we have SL pips and pair, we can at least warn on outsized SL
    if (ctx.setup.slPips > LARGE_SL_WARNING_PIPS) {
      return {
        rule: 'RRR-2',
        passed: false,
        severity: 'WARN',
        message: `SL ${ctx.setup.slPips}p is large — verify position size does not exceed ${MAX_RISK_PER_TRADE_PCT}% account risk per trade`,
      evidence: `RRR-2 check failed: SL ${ctx.setup.slPips}p is large — verify position size does not exceed ${MAX_RISK_PER_TRADE_PCT}% account risk per trade`,
      };
    }
    return {
      rule: 'RRR-2',
      passed: true,
      severity: 'INFO',
      message: 'No account balance data — position sizing check deferred to position manager',
    evidence: 'RRR-2 check passed: No account balance data — position sizing check deferred to position manager',
    };
  }

  if (positionSizePct !== undefined && positionSizePct > MAX_RISK_PER_TRADE_PCT) {
    return {
      rule: 'RRR-2',
      passed: false,
      severity: 'WARN',
      message: `Position size ${positionSizePct.toFixed(2)}% exceeds ${MAX_RISK_PER_TRADE_PCT}% max risk per trade`,
    evidence: `RRR-2 check failed: Position size ${positionSizePct.toFixed(2)}% exceeds ${MAX_RISK_PER_TRADE_PCT}% max risk per trade`,
    };
  }

  return {
    rule: 'RRR-2',
    passed: true,
    severity: 'INFO',
    message: `Position size ${positionSizePct?.toFixed(2) ?? 'N/A'}% ≤ ${MAX_RISK_PER_TRADE_PCT}% max`,
  evidence: `RRR-2 check passed: Position size ${positionSizePct?.toFixed(2) ?? 'N/A'}% ≤ ${MAX_RISK_PER_TRADE_PCT}% max`,
  };
}

/**
 * RRR-3: TP distance vs ATR
 *
 * Take profit must be at least 0.5× ATR from entry.
 * Ensures TP is far enough to capture meaningful moves above noise.
 */
export function rrr3TPDistanceVsATR(ctx: RuleCheckContext): GuardrailResult {
  const atr = ctx.pairATR;
  if (atr === undefined) {
    return {
      rule: 'RRR-3',
      passed: true,
      severity: 'INFO',
      message: 'No ATR data available — skipping TP vs ATR check',
    evidence: 'RRR-3 check passed: No ATR data available — skipping TP vs ATR check',
    };
  }

  const tpDistance = Math.abs(ctx.setup.tp - ctx.setup.entry);
  const tpATRRatio = tpDistance / atr;

  if (tpATRRatio < MIN_TP_ATR_RATIO) {
    return {
      rule: 'RRR-3',
      passed: false,
      severity: 'WARN',
      message: `TP distance ${tpDistance.toFixed(1)} is ${tpATRRatio.toFixed(2)}× ATR (ATR=${atr}) — minimum ${MIN_TP_ATR_RATIO}× ATR required`,
    evidence: `RRR-3 check failed: TP distance ${tpDistance.toFixed(1)} is ${tpATRRatio.toFixed(2)}× ATR (ATR=${atr}) — minimum ${MIN_TP_ATR_RATIO}× ATR required`,
    };
  }

  return {
    rule: 'RRR-3',
    passed: true,
    severity: 'INFO',
    message: `TP distance ${tpDistance.toFixed(1)} = ${tpATRRatio.toFixed(2)}× ATR ≥ ${MIN_TP_ATR_RATIO}×`,
  evidence: `RRR-3 check passed: TP distance ${tpDistance.toFixed(1)} = ${tpATRRatio.toFixed(2)}× ATR ≥ ${MIN_TP_ATR_RATIO}×`,
  };
}

/**
 * RRR-4: SL distance vs ATR
 *
 * Stop loss must not exceed 2× ATR from entry.
 * Ensures SL is not placed beyond meaningful market structure.
 */
export function rrr4SLDistanceVsATR(ctx: RuleCheckContext): GuardrailResult {
  const atr = ctx.pairATR;
  if (atr === undefined) {
    return {
      rule: 'RRR-4',
      passed: true,
      severity: 'INFO',
      message: 'No ATR data available — skipping SL vs ATR check',
    evidence: 'RRR-4 check passed: No ATR data available — skipping SL vs ATR check',
    };
  }

  const slDistance = Math.abs(ctx.setup.entry - ctx.setup.sl);
  const slATRRatio = slDistance / atr;

  if (slATRRatio > MAX_SL_ATR_RATIO) {
    return {
      rule: 'RRR-4',
      passed: false,
      severity: 'WARN',
      message: `SL distance ${slDistance.toFixed(1)} is ${slATRRatio.toFixed(2)}× ATR (ATR=${atr}) — exceeds ${MAX_SL_ATR_RATIO}× ATR cap`,
    evidence: `RRR-4 check failed: SL distance ${slDistance.toFixed(1)} is ${slATRRatio.toFixed(2)}× ATR (ATR=${atr}) — exceeds ${MAX_SL_ATR_RATIO}× ATR cap`,
    };
  }

  return {
    rule: 'RRR-4',
    passed: true,
    severity: 'INFO',
    message: `SL distance ${slDistance.toFixed(1)} = ${slATRRatio.toFixed(2)}× ATR ≤ ${MAX_SL_ATR_RATIO}×`,
  evidence: `RRR-4 check passed: SL distance ${slDistance.toFixed(1)} = ${slATRRatio.toFixed(2)}× ATR ≤ ${MAX_SL_ATR_RATIO}×`,
  };
}

/**
 * RRR-5: RRR vs win rate
 *
 * If TimesFM P(TP) < 0.4, RRR must be ≥ 3.0.
 * Low probability setups need higher reward to compensate.
 */
export function rrr5RRRvsWinRate(ctx: RuleCheckContext): GuardrailResult {
  const pTpReach = ctx.setup.pTpReach;

  if (pTpReach === undefined) {
    return {
      rule: 'RRR-5',
      passed: true,
      severity: 'INFO',
      message: 'No TimesFM P(TP) data — skipping RRR vs win rate check',
    evidence: 'RRR-5 check passed: No TimesFM P(TP) data — skipping RRR vs win rate check',
    };
  }

  if (pTpReach < PTP_THRESHOLD && ctx.setup.rrr < MIN_RRR_LOW_PROBABILITY) {
    return {
      rule: 'RRR-5',
      passed: false,
      severity: 'WARN',
      message: `P(TP) ${(pTpReach * PCT_MULTIPLIER).toFixed(0)}% < ${(PTP_THRESHOLD * PCT_MULTIPLIER).toFixed(0)}% but RRR ${ctx.setup.rrr} < ${MIN_RRR_LOW_PROBABILITY} — low probability setups require RRR ≥ ${MIN_RRR_LOW_PROBABILITY}`,
    evidence: `RRR-5 check failed: P(TP) ${(pTpReach * PCT_MULTIPLIER).toFixed(0)}% < ${(PTP_THRESHOLD * PCT_MULTIPLIER).toFixed(0)}% but RRR ${ctx.setup.rrr} < ${MIN_RRR_LOW_PROBABILITY} — low probability setups require RRR ≥ ${MIN_RRR_LOW_PROBABILITY}`,
    };
  }

  return {
    rule: 'RRR-5',
    passed: true,
    severity: 'INFO',
    message: `P(TP) ${(pTpReach * PCT_MULTIPLIER).toFixed(0)}% / RRR ${ctx.setup.rrr} — adequate for probability level`,
  evidence: `RRR-5 check passed: P(TP) ${(pTpReach * PCT_MULTIPLIER).toFixed(0)}% / RRR ${ctx.setup.rrr} — adequate for probability level`,
  };
}

/**
 * RRR-6: Asymmetric risk check
 *
 * Expected value must be positive (EV > 0) when TimesFM data is available.
 * This is the "edge test" — a setup with negative EV has no statistical edge.
 */
export function rrr6AsymmetricRiskCheck(ctx: RuleCheckContext): GuardrailResult {
  const expectedValue = ctx.setup.expectedValuePips;

  if (expectedValue === undefined) {
    return {
      rule: 'RRR-6',
      passed: true,
      severity: 'INFO',
      message: 'No TimesFM expected value data — skipping asymmetry check',
    evidence: 'RRR-6 check passed: No TimesFM expected value data — skipping asymmetry check',
    };
  }

  if (expectedValue <= 0) {
    // Check if spread is the reason (small positive EV eaten by spread)
    const spread = ctx.spreadPips ?? 0;
    return {
      rule: 'RRR-6',
      passed: false,
      severity: 'WARN',
      message: `Expected value ${expectedValue.toFixed(2)}p ≤ 0 (spread ${spread.toFixed(1)}p) — setup has no positive statistical edge`,
    evidence: `RRR-6 check failed: Expected value ${expectedValue.toFixed(2)}p ≤ 0 (spread ${spread.toFixed(1)}p) — setup has no positive statistical edge`,
    };
  }

  return {
    rule: 'RRR-6',
    passed: true,
    severity: 'INFO',
    message: `Expected value ${expectedValue.toFixed(2)}p > 0 — positive asymmetry confirmed`,
  evidence: `RRR-6 check passed: Expected value ${expectedValue.toFixed(2)}p > 0 — positive asymmetry confirmed`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// META-CHECK: run all RRR rules
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run all 6 RRR rules against the context.
 * Returns an array of GuardrailResult, one per rule.
 */
export function checkRRRRules(ctx: RuleCheckContext): GuardrailResult[] {
  return [
    rrr1MinRRRByCategory(ctx),
    rrr2RiskAdjustedPositionSizing(ctx),
    rrr3TPDistanceVsATR(ctx),
    rrr4SLDistanceVsATR(ctx),
    rrr5RRRvsWinRate(ctx),
    rrr6AsymmetricRiskCheck(ctx),
  ];
}
