
/**
 * Zero-Tolerance Rules — ZT-1 through ZT-17
 *
 * Hard enforcement rules from TTE v5.3.3 that complement the existing CS rules.
 * All rules are HARD_BLOCK severity — any violation rejects the setup.
 *
 * These are the non-negotiable trading discipline rules that protect the account
 * from catastrophic risk, regulatory violations, and emotional trading.
 */

import {
  TradeSetup,
  SessionWindow,
  GuardrailResult,
  ZoneType,
  SetupCategory,
} from '../types.js';
import { RuleCheckContext } from './index.js';
import {
  NEWS_EXCLUSION_MIN, MAX_RISK_PER_PAIR_PCT, ILLIQUID_START_ET_STR,
  ILLIQUID_END_ET_STR, MAX_CORRELATED_SETUPS, MAX_DAILY_DRAWDOWN_PCT,
  MIN_ENTRY_GAP_MINUTES, REVENGE_COOLDOWN_MIN, MAX_SPREAD_TP_RATIO,
  MIN_TIMEFRAMES_REFERENCED, MINUTES_PER_DAY, MINUTES_PER_HOUR,
  PIP_VALUE_DEFAULT, PCT_MULTIPLIER,
  MAX_TRADES_PER_CHAIN,
} from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Constants imported from trading-constants.ts — local aliases for backward compat
const ILLIQUID_START_ET = ILLIQUID_START_ET_STR;
const ILLIQUID_END_ET = ILLIQUID_END_ET_STR;
const DAILY_MAX_DRAWDOWN_PCT = MAX_DAILY_DRAWDOWN_PCT;
const MIN_ENTRY_GAP_MIN = MIN_ENTRY_GAP_MINUTES;
const MIN_TIMEFRAMES = MIN_TIMEFRAMES_REFERENCED;

/** Regular session windows for forex (valid trading hours). */
const VALID_SESSION_WINDOWS: SessionWindow[] = [
  SessionWindow.LONDON_OPEN,
  SessionWindow.LONDON_MID,
  SessionWindow.NY_OVERLAP,
  SessionWindow.NY_OPEN,
  SessionWindow.NY_MID,
  SessionWindow.NY_CLOSE,
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: time string (HH:MM ET) to minutes since midnight
// ═══════════════════════════════════════════════════════════════════════════════

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h ?? 0) * MINUTES_PER_HOUR + (m ?? 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ZT-1: No trade during NFP/FOMC
 *
 * Hard block trades 30 minutes before to 30 minutes after major news events.
 * Major events: NFP (first Friday of month, 8:30 ET), FOMC (scheduled dates).
 * The caller is responsible for setting ctx.redFolderActive when a news event
 * is within the exclusion window.
 */
export function zt1NoTradeNewsWindow(ctx: RuleCheckContext): GuardrailResult {
  if (ctx.redFolderActive) {
    return {
      rule: 'ZT-1',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Major news event active — no trading within ${NEWS_EXCLUSION_MIN}min window (NFP/FOMC)`,
    evidence: `ZT-1 check failed: Major news event active — no trading within ${NEWS_EXCLUSION_MIN}min window (NFP/FOMC)`,
    };
  }
  return {
    rule: 'ZT-1',
    passed: true,
    severity: 'INFO',
    message: 'No active news exclusion window',
    evidence: 'ctx.redFolderActive=false — no NFP/FOMC within ±30min window',
  };
}

/**
 * ZT-2: No averaging into losers
 *
 * Must not add to a losing position. If there are existing open positions for
 * the same pair in the same direction, and the latest is at a loss, reject.
 */
export function zt2NoAveragingIntoLosers(ctx: RuleCheckContext): GuardrailResult {
  if (ctx.isReportGeneration) {
    return { rule: 'ZT-2', passed: true, severity: 'INFO',
        message: 'Report generation mode — ZT-2 skipped (no open positions)',
        evidence: 'ctx.isReportGeneration=true — predictions are not open positions' };
  }
  if (!ctx.allSetups || ctx.allSetups.length === 0) {
    return {
      rule: 'ZT-2',
      passed: true,
      severity: 'INFO',
      message: 'No existing setups to check for averaging',
      evidence: 'ctx.allSetups is empty or undefined — no open positions to average into',
    };
  }

  const samePairDirection = ctx.allSetups.filter(
    (s: TradeSetup) => s.pair === ctx.setup.pair && s.direction === ctx.setup.direction,
  );

  if (samePairDirection.length === 0) {
    return {
      rule: 'ZT-2',
      passed: true,
      severity: 'INFO',
      message: 'No existing positions in same pair/direction',
      evidence: `ctx.allSetups filtered for ${ctx.setup.pair}/${ctx.setup.direction} = 0 matches`,
    };
  }

  // Check if most recent setup in same direction is at a loss (entry worse than current spot)
  const sorted = [...samePairDirection].sort((a: TradeSetup, b: TradeSetup) => b.setupId.localeCompare(a.setupId));
  const latest = sorted[0];
  if (!latest) {
    return {
      rule: 'ZT-2',
      passed: true,
      severity: 'INFO',
      message: 'No recent setup found',
      evidence: 'samePairDirection array was empty after sort — no prior entries',
    };
  }

  const isLong = ctx.setup.direction === 'LONG';
  const latestInLoss = isLong
    ? ctx.spotPrice < latest.entry
    : ctx.spotPrice > latest.entry;

  if (latestInLoss) {
    return {
      rule: 'ZT-2',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Averaging into loser detected: latest ${ctx.setup.pair} ${ctx.setup.direction} entry ${latest.entry} vs spot ${ctx.spotPrice}`,
    evidence: `ZT-2 check failed: Averaging into loser detected: latest ${ctx.setup.pair} ${ctx.setup.direction} entry ${latest.entry} vs spot ${ctx.spotPrice}`,
    };
  }

  return {
    rule: 'ZT-2',
    passed: true,
    severity: 'INFO',
    message: 'No averaging into losers',
    evidence: `latest entry ${latest.entry} vs spot ${ctx.spotPrice} — position not in loss`,
  };
}

/**
 * ZT-3: Max 3% risk per pair
 *
 * Total risk per pair across all open positions must not exceed 3% of account.
 */
export function zt3MaxRiskPerPair(ctx: RuleCheckContext): GuardrailResult {
  const pairRiskPct = ctx.pairRiskPct;
  if (pairRiskPct === undefined) {
    return {
      rule: 'ZT-3',
      passed: true,
      severity: 'INFO',
      message: 'No pair risk data available — skipping ZT-3',
      evidence: 'ctx.pairRiskPct is undefined — no risk aggregation data',
    };
  }

  if (pairRiskPct > MAX_RISK_PER_PAIR_PCT) {
    return {
      rule: 'ZT-3',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Total risk for ${ctx.setup.pair} is ${pairRiskPct.toFixed(1)}% — exceeds ${MAX_RISK_PER_PAIR_PCT}% max per pair`,
    evidence: `ZT-3 check failed: Total risk for ${ctx.setup.pair} is ${pairRiskPct.toFixed(1)}% — exceeds ${MAX_RISK_PER_PAIR_PCT}% max per pair`,
    };
  }

  return {
    rule: 'ZT-3',
    passed: true,
    severity: 'INFO',
    message: `Pair risk ${pairRiskPct.toFixed(1)}% ≤ ${MAX_RISK_PER_PAIR_PCT}%`,
    evidence: `ctx.pairRiskPct=${pairRiskPct.toFixed(1)}% — within ${MAX_RISK_PER_PAIR_PCT}% limit`,
  };
}

/**
 * ZT-4: No trading during illiquid hours
 *
 * Block trades outside major forex sessions (3AM-6AM ET is illiquid for forex).
 */
export function zt4NoIlliquidHours(ctx: RuleCheckContext): GuardrailResult {
  const currentTimeStr = ctx.currentTime;
  if (!currentTimeStr) {
    return {
      rule: 'ZT-4',
      passed: true,
      severity: 'INFO',
      message: 'No current time available — skipping illiquid hours check',
      evidence: 'ctx.currentTime is falsy — time-based check deferred',
    };
  }

  const nowMinutes = timeToMinutes(currentTimeStr);
  const illiquidStart = timeToMinutes(ILLIQUID_START_ET);
  const illiquidEnd = timeToMinutes(ILLIQUID_END_ET);

  if (nowMinutes >= illiquidStart && nowMinutes < illiquidEnd) {
    return {
      rule: 'ZT-4',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Trading during illiquid hours (${ILLIQUID_START_ET}-${ILLIQUID_END_ET} ET) blocked — low liquidity window`,
    evidence: `ZT-4 check failed: Trading during illiquid hours (${ILLIQUID_START_ET}-${ILLIQUID_END_ET} ET) blocked — low liquidity window`,
    };
  }

  return {
    rule: 'ZT-4',
    passed: true,
    severity: 'INFO',
    message: `Current time ${currentTimeStr} outside illiquid hours`,
    evidence: `${currentTimeStr} (${nowMinutes}min) not in [${illiquidStart}min, ${illiquidEnd}min) illiquid window`,
  };
}

/**
 * ZT-5: Correlation cap
 *
 * No more than 2 correlated setups simultaneously.
 * Correlated pairs: EUR/USD & GBP/USD (long both = USD short), AUD/USD & NZD/USD, etc.
 */
export function zt5CorrelationCap(ctx: RuleCheckContext): GuardrailResult {
  if (ctx.isReportGeneration) {
    return { rule: 'ZT-5', passed: true, severity: 'INFO',
        message: 'Report generation mode — ZT-5 skipped (predictions are not correlations)',
        evidence: 'ctx.isReportGeneration=true' };
  }
  if (!ctx.allSetups || ctx.allSetups.length === 0) {
    return {
      rule: 'ZT-5',
      passed: true,
      severity: 'INFO',
      message: 'No existing setups to check correlation',
      evidence: 'ctx.allSetups is empty or undefined — no concurrent positions',
    };
  }

  // Define correlation groups
  const correlationGroups: Array<{ name: string; pairs: string[]; direction?: string }> = [
    { name: 'USD_short', pairs: ['EUR/USD', 'GBP/USD', 'AUD/USD'], direction: 'LONG' },
    { name: 'USD_long', pairs: ['EUR/USD', 'GBP/USD', 'AUD/USD'], direction: 'SHORT' },
    { name: 'commodity', pairs: ['AUD/USD', 'NZD/USD'], direction: 'LONG' },
    { name: 'commodity_short', pairs: ['AUD/USD', 'NZD/USD'], direction: 'SHORT' },
  ];

  for (const group of correlationGroups) {
    // Count existing setups in this correlation group (excluding current setup to avoid double-count)
    const existingCorrelated = ctx.allSetups.filter(
      (s: TradeSetup) => s.setupId !== ctx.setup.setupId &&
        group.pairs.includes(s.pair) && s.direction === (group.direction ?? s.direction),
    ).length;

    // Count the current setup if it belongs to this group
    const currentInGroup = group.pairs.includes(ctx.setup.pair) &&
      (group.direction === undefined || ctx.setup.direction === group.direction);

    const total = existingCorrelated + (currentInGroup ? 1 : 0);
    if (total > MAX_CORRELATED_SETUPS) {
      return {
        rule: 'ZT-5',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `Correlation cap exceeded: ${total} correlated setups in group "${group.name}" — max ${MAX_CORRELATED_SETUPS} allowed`,
      evidence: `ZT-5 check failed: Correlation cap exceeded: ${total} correlated setups in group "${group.name}" — max ${MAX_CORRELATED_SETUPS} allowed`,
      };
    }
  }

  return {
    rule: 'ZT-5',
    passed: true,
    severity: 'INFO',
    message: 'Correlation cap check passed',
    evidence: 'All correlation groups ≤ MAX_CORRELATED_SETUPS concurrent',
  };
}

/**
 * ZT-6: Daily loss limit
 *
 * Max 5% daily drawdown. If daily drawdown exceeds 5%, block all new trades.
 */
export function zt6DailyLossLimit(ctx: RuleCheckContext): GuardrailResult {
  const dailyDrawdown = ctx.dailyDrawdown;
  if (dailyDrawdown === undefined) {
    return {
      rule: 'ZT-6',
      passed: true,
      severity: 'INFO',
      message: 'No daily drawdown data available — skipping ZT-6',
      evidence: 'ctx.dailyDrawdown is undefined — no P&L session data',
    };
  }

  if (dailyDrawdown >= DAILY_MAX_DRAWDOWN_PCT) {
    return {
      rule: 'ZT-6',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Daily drawdown ${dailyDrawdown.toFixed(1)}% ≥ ${DAILY_MAX_DRAWDOWN_PCT}% max — trading halted for the day`,
    evidence: `ZT-6 check failed: Daily drawdown ${dailyDrawdown.toFixed(1)}% ≥ ${DAILY_MAX_DRAWDOWN_PCT}% max — trading halted for the day`,
    };
  }

  return {
    rule: 'ZT-6',
    passed: true,
    severity: 'INFO',
    message: `Daily drawdown ${dailyDrawdown.toFixed(1)}% < ${DAILY_MAX_DRAWDOWN_PCT}%`,
    evidence: `ctx.dailyDrawdown=${dailyDrawdown.toFixed(1)}% — below ${DAILY_MAX_DRAWDOWN_PCT}% halt threshold`,
  };
}

/**
 * ZT-7: No martingale
 *
 * Position size must not double after a loss. If the previous setup for the same
 * pair/direction had a larger position size or the consecutive loss count > 0,
 * the current position size must not exceed the previous one.
 */
export function zt7NoMartingale(ctx: RuleCheckContext): GuardrailResult {
  const consecutiveLosses = ctx.consecutiveLosses;
  if (consecutiveLosses === undefined || consecutiveLosses === 0) {
    return {
      rule: 'ZT-7',
      passed: true,
      severity: 'INFO',
      message: 'No consecutive losses — martingale check N/A',
      evidence: 'ctx.consecutiveLosses is 0 or undefined — no loss streak to escalate',
    };
  }

  // If we have consecutive losses, position size multiplication is blocked
  // The position manager is expected to enforce constant or decreasing size
  if (consecutiveLosses >= 1) {
    return {
      rule: 'ZT-7',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Martingale pattern detected: ${consecutiveLosses} consecutive losses — position size must not increase after loss`,
    evidence: `ZT-7 check failed: Martingale pattern detected: ${consecutiveLosses} consecutive losses — position size must not increase after loss`,
    };
  }

  return {
    rule: 'ZT-7',
    passed: true,
    severity: 'INFO',
    message: 'No martingale pattern detected',
    evidence: 'consecutiveLosses < 1 — no position-size escalation triggered',
  };
}

/**
 * ZT-8: Min 15min between entries
 *
 * Time gap between consecutive entries must be at least 15 minutes.
 */
export function zt8MinEntryGap(ctx: RuleCheckContext): GuardrailResult {
  if (!ctx.lastEntryTime || !ctx.currentTime) {
    return {
      rule: 'ZT-8',
      passed: true,
      severity: 'INFO',
      message: 'No entry timing data available — skipping ZT-8',
      evidence: 'ctx.lastEntryTime or ctx.currentTime is falsy — no timing data',
    };
  }

  const lastMinutes = timeToMinutes(ctx.lastEntryTime);
  const nowMinutes = timeToMinutes(ctx.currentTime);
  const gap = nowMinutes - lastMinutes;

  // Handle overnight wrap
  const gapAdjusted = gap >= 0 ? gap : gap + MINUTES_PER_DAY;

  if (gapAdjusted < MIN_ENTRY_GAP_MIN) {
    return {
      rule: 'ZT-8',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Entry gap ${gapAdjusted}min < ${MIN_ENTRY_GAP_MIN}min minimum — wait before next entry`,
    evidence: `ZT-8 check failed: Entry gap ${gapAdjusted}min < ${MIN_ENTRY_GAP_MIN}min minimum — wait before next entry`,
    };
  }

  return {
    rule: 'ZT-8',
    passed: true,
    severity: 'INFO',
    message: `Entry gap ${gapAdjusted}min ≥ ${MIN_ENTRY_GAP_MIN}min`,
    evidence: `gap=${gapAdjusted}min from ${ctx.lastEntryTime}→${ctx.currentTime} — ≥ ${MIN_ENTRY_GAP_MIN}min minimum`,
  };
}

/**
 * ZT-9: No revenge trading
 *
 * After a stop-out (consecutive loss), wait 1 hour before next entry.
 */
export function zt9NoRevengeTrading(ctx: RuleCheckContext): GuardrailResult {
  const consecutiveLosses = ctx.consecutiveLosses;
  if (!consecutiveLosses || consecutiveLosses < 1) {
    return {
      rule: 'ZT-9',
      passed: true,
      severity: 'INFO',
      message: 'No recent stop-outs — revenge trading check N/A',
      evidence: 'ctx.consecutiveLosses < 1 — no prior stop-out to cooldown from',
    };
  }

  if (!ctx.lastEntryTime || !ctx.currentTime) {
    return {
      rule: 'ZT-9',
      passed: true,
      severity: 'INFO',
      message: 'No timing data — revenge trading check skipped',
      evidence: 'ctx.lastEntryTime or ctx.currentTime is falsy — cooldown not measurable',
    };
  }

  const lastMinutes = timeToMinutes(ctx.lastEntryTime);
  const nowMinutes = timeToMinutes(ctx.currentTime);
  const gap = nowMinutes - lastMinutes;
  const gapAdjusted = gap >= 0 ? gap : gap + MINUTES_PER_DAY;

  if (gapAdjusted < REVENGE_COOLDOWN_MIN) {
    return {
      rule: 'ZT-9',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Revenge trading cooldown active: ${gapAdjusted}min since last stop-out — wait ${REVENGE_COOLDOWN_MIN}min`,
    evidence: `ZT-9 check failed: Revenge trading cooldown active: ${gapAdjusted}min since last stop-out — wait ${REVENGE_COOLDOWN_MIN}min`,
    };
  }

  return {
    rule: 'ZT-9',
    passed: true,
    severity: 'INFO',
    message: `Cooldown ${gapAdjusted}min ≥ ${REVENGE_COOLDOWN_MIN}min`,
    evidence: `${gapAdjusted}min since last entry — ≥ ${REVENGE_COOLDOWN_MIN}min cooldown satisfied`,
  };
}

/**
 * ZT-10: Session consistency
 *
 * Entry must match the setup's session window. If the setup specifies a session,
 * the current trading session must match.
 */
export function zt10SessionConsistency(ctx: RuleCheckContext): GuardrailResult {
  if (!ctx.currentSession || !ctx.setup.session) {
    return {
      rule: 'ZT-10',
      passed: true,
      severity: 'INFO',
      message: 'Session data incomplete — consistency check skipped',
      evidence: 'ctx.currentSession or ctx.setup.session is falsy — cannot compare',
    };
  }

  if (ctx.currentSession !== ctx.setup.session) {
    return {
      rule: 'ZT-10',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Session mismatch: setup session ${ctx.setup.session} ≠ current session ${ctx.currentSession}`,
    evidence: `ZT-10 check failed: Session mismatch: setup session ${ctx.setup.session} ≠ current session ${ctx.currentSession}`,
    };
  }

  return {
    rule: 'ZT-10',
    passed: true,
    severity: 'INFO',
    message: `Session consistent: ${ctx.currentSession}`,
    evidence: `ctx.currentSession === ctx.setup.session === ${ctx.currentSession}`,
  };
}

/**
 * ZT-11: Spread cost validation
 *
 * Spread must not exceed 20% of expected TP in pips.
 */
export function zt11SpreadCostValidation(ctx: RuleCheckContext): GuardrailResult {
  const spreadPips = ctx.spreadPips;
  if (spreadPips === undefined) {
    return {
      rule: 'ZT-11',
      passed: true,
      severity: 'INFO',
      message: 'No spread data available — skipping ZT-11',
      evidence: 'ctx.spreadPips is undefined — spread cost not measurable',
    };
  }

  const tpPips = ctx.setup.tp !== undefined && ctx.setup.entry !== undefined
    ? Math.abs(ctx.setup.tp - ctx.setup.entry)
    : undefined;

  if (tpPips === undefined || tpPips === 0) {
    return {
      rule: 'ZT-11',
      passed: true,
      severity: 'INFO',
      message: 'No TP distance available — skipping spread validation',
      evidence: 'ctx.setup.tp or ctx.setup.entry undefined, or TP distance = 0',
    };
  }

  const spreadRatio = spreadPips / tpPips;
  if (spreadRatio > MAX_SPREAD_TP_RATIO) {
    return {
      rule: 'ZT-11',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Spread ${spreadPips.toFixed(1)}p is ${(spreadRatio * PCT_MULTIPLIER).toFixed(0)}% of TP ${tpPips.toFixed(1)}p — exceeds ${(MAX_SPREAD_TP_RATIO * PCT_MULTIPLIER).toFixed(0)}% cap`,
    evidence: `ZT-11 check failed: Spread ${spreadPips.toFixed(1)}p is ${(spreadRatio * PCT_MULTIPLIER).toFixed(0)}% of TP ${tpPips.toFixed(1)}p — exceeds ${(MAX_SPREAD_TP_RATIO * PCT_MULTIPLIER).toFixed(0)}% cap`,
    };
  }

  return {
    rule: 'ZT-11',
    passed: true,
    severity: 'INFO',
    message: `Spread ${spreadPips.toFixed(1)}p / TP ${tpPips.toFixed(1)}p = ${(spreadRatio * PCT_MULTIPLIER).toFixed(0)}% ≤ ${(MAX_SPREAD_TP_RATIO * PCT_MULTIPLIER).toFixed(0)}%`,
    evidence: `${spreadPips.toFixed(1)}p spread / ${tpPips.toFixed(1)}p TP = ${(spreadRatio * PCT_MULTIPLIER).toFixed(0)}% — ≤ ${(MAX_SPREAD_TP_RATIO * PCT_MULTIPLIER).toFixed(0)}% cap`,
  };
}

/**
 * ZT-12: No overfitting
 *
 * Setup must reference at least 2 different timeframes.
 */
export function zt12NoOverfitting(ctx: RuleCheckContext): GuardrailResult {
  if (ctx.isReportGeneration) {
    return { rule: 'ZT-12', passed: true, severity: 'INFO',
        message: 'Report generation mode — ZT-12 skipped (nearby zone entries are expected)',
        evidence: 'ctx.isReportGeneration=true' };
  }
  const notes = ctx.setup.notes.toLowerCase();
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', 'daily', 'd1', 'weekly', 'w1', 'monthly'];

  const foundTimeframes = timeframes.filter((tf: string) => notes.includes(tf));

  if (foundTimeframes.length < MIN_TIMEFRAMES) {
    return {
      rule: 'ZT-12',
      passed: false,
      severity: 'INFO',
      message: `Setup references ${foundTimeframes.length} timeframe(s) — minimum ${MIN_TIMEFRAMES} required (found: ${foundTimeframes.join(', ') || 'none'})`,
    evidence: `ZT-12 check failed: Setup references ${foundTimeframes.length} timeframe(s) — minimum ${MIN_TIMEFRAMES} required (found: ${foundTimeframes.join(', ') || 'none'})`,
    };
  }

  return {
    rule: 'ZT-12',
    passed: true,
    severity: 'INFO',
    message: `Setup references ${foundTimeframes.length} timeframes: ${foundTimeframes.join(', ')}`,
    evidence: `foundTimeframes=[${foundTimeframes.join(', ')}] — ≥ ${MIN_TIMEFRAMES} required`,
  };
}

/**
 * ZT-13: DAY+SESSION labels required
 *
 * Every setup must have day and session_window populated on the setup itself.
 */
export function zt13DaySessionLabels(ctx: RuleCheckContext): GuardrailResult {
  const missing: string[] = [];

  if (!ctx.setup.day || ctx.setup.day.trim() === '') {
    missing.push('day');
  }

  if (!ctx.setup.session) {
    missing.push('session_window');
  }

  if (missing.length > 0) {
    return {
      rule: 'ZT-13',
      passed: false,
      severity: 'INFO',
      message: `Setup missing required labels: ${missing.join(', ')} — all setups must have day + session_window populated`,
    evidence: `ZT-13 check failed: Setup missing required labels: ${missing.join(', ')} — all setups must have day + session_window populated`,
    };
  }

  return {
    rule: 'ZT-13',
    passed: true,
    severity: 'INFO',
    message: `Setup has day="${ctx.setup.day}" session="${ctx.setup.session}"`,
    evidence: `day="${ctx.setup.day}" session="${ctx.setup.session}" — both non-empty`,
  };
}

/**
 * ZT-14: No manual override without evidence
 *
 * Manual parameter changes must be documented in setup notes.
 */
export function zt14NoManualOverrideWithoutEvidence(ctx: RuleCheckContext): GuardrailResult {
  // Check if manual override markers exist in notes
  const notes = ctx.setup.notes.toLowerCase();

  // Detect entries or SL/TP values that appear manually overridden
  const overrideIndicators = [
    'manual override',
    'manually set',
    'adjusted entry',
    'adjusted sl',
    'adjusted tp',
    'overridden',
    'forced entry',
  ];

  // If we detect an override indicator, require an evidence link
  const hasOverrideIndicator = overrideIndicators.some((ind: string) => notes.includes(ind));

  if (hasOverrideIndicator) {
    // Check that evidence/documentation exists
    const hasEvidence = notes.includes('reason:') || notes.includes('evidence:') ||
      notes.includes('rationale:') || notes.includes('justification:') ||
      notes.includes('override_reason');

    if (!hasEvidence) {
      return {
        rule: 'ZT-14',
        passed: false,
        severity: 'HARD_BLOCK',
        message: 'Manual override detected without documented evidence — provide reason/evidence in notes',
      evidence: 'ZT-14 check failed: Manual override detected without documented evidence — provide reason/evidence in notes',
      };
    }
  }

  return {
    rule: 'ZT-14',
    passed: true,
    severity: 'INFO',
    message: hasOverrideIndicator ? 'Manual override with evidence documented' : 'No manual override detected',
    evidence: hasOverrideIndicator ? 'Override markers found + reason/evidence link present in notes' : 'No override indicators detected in setup notes',
  };
}

/**
 * ZT-15: 4H MoM one-and-done
 *
 * First retest of 4H MoM = minor reaction, then likely strong pierce.
 * After first reaction: scalp only, NO swing entries.
 */
export function zt15No4HMoMSwingEntries(ctx: RuleCheckContext): GuardrailResult {
  if (ctx.isReportGeneration) {
    return { rule: 'ZT-15', passed: true, severity: 'WARN',
        message: 'Report generation mode — MoM conditional entries allowed with 4-exception check',
        evidence: 'ctx.isReportGeneration=true — MoM entries valid in report context' };
  }
  if (!ctx.zone) {
    return { rule: 'ZT-15', passed: true, severity: 'INFO', message: 'No zone to check', evidence: 'ctx.zone is undefined — 4H MoM classification not applicable' };
  }

  const zone = ctx.zone;
  const is4HMoM = zone.type === ZoneType.MOM_SUPPLY || zone.type === ZoneType.MOM_DEMAND;
  if (!is4HMoM) {
    return { rule: 'ZT-15', passed: true, severity: 'INFO', message: 'Not a 4H MoM zone', evidence: `zone.type=${zone.type} — not MOM_SUPPLY or MOM_DEMAND` };
  }

  // Check if this MoM zone has already had reactions
  if (zone.reactionCount >= 1) {
    const isSwing = ctx.setup.category === SetupCategory.HTF_SWING;
    if (isSwing) {
      return {
        rule: 'ZT-15',
        passed: false,
        severity: 'HARD_BLOCK',
        message: `4H MoM zone has ${zone.reactionCount} reaction(s) — after first reaction, expect pierce. Swing entries prohibited. Scalp only.`,
      evidence: `ZT-15 check failed: 4H MoM zone has ${zone.reactionCount} reaction(s) — after first reaction, expect pierce. Swing entries prohibited. Scalp only.`,
      };
    }
  }

  return { rule: 'ZT-15', passed: true, severity: 'INFO', message: '4H MoM zone OK for scalp entry', evidence: `reactionCount=${zone.reactionCount}, setup not HTF_SWING — scalp entry permitted` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// META-CHECK: run all zero-tolerance rules
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ZT-16: Every setup must have DAY + SESSION labels for blind execution
 *
 * TTE v5.3.3 Critical Rule #1: Every setup MUST inherit its DAY and SESSION
 * from Engine 2's day decomposition BEFORE the week begins. Without these
 * labels, the setup cannot be blindly executed — the trader wouldn't know
 * which day or session to trade it.
 *
 * This is stricter than ZT-13: it requires both fields to be non-empty and
 * explicitly references the TTE v5.3.3 blind execution requirement.
 */
export function zt16RequireDaySession(ctx: RuleCheckContext): GuardrailResult {
  if (!ctx.setup.day || ctx.setup.day.trim() === '') {
    return {
      rule: 'ZT-16',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Setup missing DAY label — required for blind execution per TTE v5.3.3 Critical Rule #1`,
    evidence: `ZT-16 check failed: Setup missing DAY label — required for blind execution per TTE v5.3.3 Critical Rule #1`,
    };
  }

  if (!ctx.setup.session) {
    return {
      rule: 'ZT-16',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Setup missing SESSION label — required for blind execution per TTE v5.3.3 Critical Rule #1`,
    evidence: `ZT-16 check failed: Setup missing SESSION label — required for blind execution per TTE v5.3.3 Critical Rule #1`,
    };
  }

  return {
    rule: 'ZT-16',
    passed: true,
    severity: 'INFO',
    message: `DAY="${ctx.setup.day}" + SESSION="${ctx.setup.session}" labels present — blind execution ready`,
    evidence: `day="${ctx.setup.day}" session="${ctx.setup.session}" — both populated per TTE v5.3.3 Critical Rule #1`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// META-CHECK: run all zero-tolerance rules
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ZT-17: Max trades per chain (TTE v5.3.3 §7.4 — rule 4)
 *
 * A trade flow chain may contain at most MAX_TRADES_PER_CHAIN (3) links.
 * After 3 trades the macro shape must be reassessed before chaining again.
 *
 * This rule HARD_BLOCKS any setup whose `chainPosition` would push the chain
 * past the cap (i.e. chainPosition > MAX_TRADES_PER_CHAIN). Setups that are
 * not part of a chain (chainPosition undefined) always pass.
 */
export function zt17MaxTradesPerChain(ctx: RuleCheckContext): GuardrailResult {
  // Report generation: setups on different days are independent predictions, NOT a live trading chain.
  // The max-3-per-chain rule is for live execution where you chain sequential trades.
  // During report generation, 5 DXY SHORT setups across Mon-Fri are 5 independent predictions, not a chain of 5.
  if (ctx.isReportGeneration) {
    return {
      rule: 'ZT-17',
      passed: true,
      severity: 'INFO',
      message: 'Report generation mode — ZT-17 skipped (per-day setups are independent predictions, not a live chain)',
      evidence: 'ctx.isReportGeneration=true — chain position limits do not apply to weekly predictions',
    };
  }
  const pos = ctx.setup.chainPosition;
  if (pos === undefined) {
    return {
      rule: 'ZT-17',
      passed: true,
      severity: 'INFO',
      message: 'Standalone setup — not part of a trade flow chain',
      evidence: 'ctx.setup.chainPosition is undefined — setup is standalone, not chained',
    };
  }
  if (pos > MAX_TRADES_PER_CHAIN) {
    return {
      rule: 'ZT-17',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Chain position ${pos} exceeds max ${MAX_TRADES_PER_CHAIN} trades per chain (TTE v5.3.3 §7.4 rule 4) — reassess macro shape before chaining`,
    evidence: `ZT-17 check failed: Chain position ${pos} exceeds max ${MAX_TRADES_PER_CHAIN} trades per chain (TTE v5.3.3 §7.4 rule 4) — reassess macro shape before chaining`,
    };
  }
  return {
    rule: 'ZT-17',
    passed: true,
    severity: 'INFO',
    message: `Chain position ${pos}/${MAX_TRADES_PER_CHAIN} within flow chain ${ctx.setup.chainId ?? '?'}`,
    evidence: `chainPosition=${pos} ≤ ${MAX_TRADES_PER_CHAIN} — within chain limit`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// META-CHECK: run all zero-tolerance rules
// ═══════════════════════════════════════════════════════════════════════════════
export function checkZeroTolerance(ctx: RuleCheckContext): GuardrailResult[] {
  return [
    zt1NoTradeNewsWindow(ctx),
    zt2NoAveragingIntoLosers(ctx),
    zt3MaxRiskPerPair(ctx),
    zt4NoIlliquidHours(ctx),
    zt5CorrelationCap(ctx),
    zt6DailyLossLimit(ctx),
    zt7NoMartingale(ctx),
    zt8MinEntryGap(ctx),
    zt9NoRevengeTrading(ctx),
    zt10SessionConsistency(ctx),
    zt11SpreadCostValidation(ctx),
    zt12NoOverfitting(ctx),
    zt13DaySessionLabels(ctx),
    zt14NoManualOverrideWithoutEvidence(ctx),
    zt15No4HMoMSwingEntries(ctx),
    zt16RequireDaySession(ctx),
    zt17MaxTradesPerChain(ctx),
  ];
}
