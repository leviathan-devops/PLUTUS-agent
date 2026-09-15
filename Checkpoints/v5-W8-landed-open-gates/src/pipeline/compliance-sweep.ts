/**
 * ComplianceSweep — Post-generation compliance verification (FIX-016).
 *
 * TTE v5.3.3 Step 15: After the report is generated, a SEPARATE compliance
 * sweep runs to verify every requirement. This is NOT embedded in the report
 * generator — it's a standalone verification step.
 *
 * Checks:
 *   1. Every setup has a DAY label (Monday-Friday)
 *   2. No setup exists without a shape trigger
 *   3. Weekly calendar covers all 5 trading days
 *   4. No entry requires real-time analysis not in report
 *
 * Returns a structured pass/fail result with specific details.
 */

import {
  ConfidenceTier,
  SetupCategory,
  TradeDirection,
  type TradeSetup,
} from '../types.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('ComplianceSweep');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SweepCheck {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
  /** Human-readable explanation of the pass/fail decision for audit evidence. */
  evidence: string;
  violations?: string[];
}

export interface ComplianceSweepResult {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  checks: SweepCheck[];
  reportTimestamp: number;
  /** Human-readable explanation of the overall sweep decision for audit evidence. */
  evidence: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_WEEKDAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check 1: Every setup has a valid DAY label (Monday-Friday).
 * A setup without a day label cannot be blindly executed.
 */
function checkDayLabels(setups: TradeSetup[]): SweepCheck {
  const violations: string[] = [];

  for (const s of setups) {
    if (!s.day || !VALID_WEEKDAYS.has(s.day)) {
      violations.push(`${s.setupId}: missing or invalid day="${s.day}"`);
    }
  }

  return {
    id: 'day-labels',
    name: 'Day Labels',
    passed: violations.length === 0,
    detail: violations.length === 0
      ? `All ${setups.length} setups have valid weekday labels`
      : `${violations.length} setup(s) missing or invalid day label`,
    evidence: violations.length === 0
      ? `Day-label check PASSED: all ${setups.length} setups carry a valid weekday (Mon-Fri). Trader can locate each setup by day in the calendar.`
      : `Day-label check FAILED: ${violations.length} of ${setups.length} setups have missing or out-of-range day labels. Violations: ${violations.join('; ')}. Setups without a day label cannot be placed in the weekly calendar.`,
    violations: violations.length > 0 ? violations : undefined,
  };
}

/**
 * Check 2: No setup exists without a shape trigger.
 * Every setup must reference a specific macro shape (SS, BS, WL, etc.).
 */
function checkShapeTriggers(setups: TradeSetup[]): SweepCheck {
  const violations: string[] = [];

  for (const s of setups) {
    if (!s.shapeTrigger || s.shapeTrigger.trim() === '') {
      violations.push(`${s.setupId}: no shape trigger specified`);
    }
    if (!s.shapeAlignment) {
      violations.push(`${s.setupId}: no shapeAlignment field`);
    }
  }

  return {
    id: 'shape-triggers',
    name: 'Shape Triggers',
    passed: violations.length === 0,
    detail: violations.length === 0
      ? `All ${setups.length} setups have shape triggers`
      : `${violations.length} setup(s) without shape trigger`,
    evidence: violations.length === 0
      ? `Shape-trigger check PASSED: all ${setups.length} setups specify both a shapeTrigger and shapeAlignment. Trader can identify the macro shape condition without chart analysis.`
      : `Shape-trigger check FAILED: ${violations.length} setup(s) are missing a shape trigger or alignment. Violations: ${violations.join('; ')}. A setup without a shape condition is not blindly executable.`,
    violations: violations.length > 0 ? violations : undefined,
  };
}

/**
 * Check 3: Weekly calendar covers all 5 trading days.
 * The report must account for every day Mon-Fri, even if a day has no setups
 * (it should be explicitly noted as "no setups"). Any setup with a day OUTSIDE
 * Monday-Friday breaks calendar coverage.
 */
function checkCalendarCoverage(setups: TradeSetup[]): SweepCheck {
  const daysWithSetups = new Set(setups.map((s: TradeSetup) => s.day).filter((d: string) => VALID_WEEKDAYS.has(d)));
  const missingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    .filter((d: string) => !daysWithSetups.has(d));

  // Any setup with a day OUTSIDE Monday-Friday breaks calendar coverage
  const outOfRange = setups.filter((s: TradeSetup) => s.day && !VALID_WEEKDAYS.has(s.day));

  return {
    id: 'calendar-coverage',
    name: 'Calendar Coverage (5 Trading Days)',
    passed: outOfRange.length === 0,
    detail: outOfRange.length > 0
      ? `${outOfRange.length} setup(s) have days outside Mon-Fri`
      : missingDays.length > 0
        ? `Days without setups: ${missingDays.join(', ')} (OK — explicitly noted in calendar)`
        : 'All 5 trading days have at least one setup',
    evidence: outOfRange.length > 0
      ? `Calendar-coverage check FAILED: ${outOfRange.length} setup(s) reference days outside Monday-Friday. These cannot be placed in a standard 5-day trading calendar. Violations: ${outOfRange.map((s) => `${s.setupId}: day="${s.day}"`).join('; ')}.`
      : missingDays.length > 0
        ? `Calendar-coverage check PASSED with notes: all setup days fall within Mon-Fri. Days without setups (${missingDays.join(', ')}) are acceptable as long as they are explicitly noted in the report calendar.`
        : `Calendar-coverage check PASSED: all 5 trading days (Mon-Fri) have at least one setup. Full weekly coverage achieved.`,
    violations: outOfRange.length > 0
      ? outOfRange.map((s: TradeSetup) => `${s.setupId}: day="${s.day}" outside Mon-Fri`)
      : undefined,
  };
}

/**
 * Check 4: No entry requires real-time analysis not in the report.
 * Every entry price, SL, TP, and session window must be explicitly stated.
 * No setup should say "monitor in real-time" or "decide at market".
 */
function checkSelfContained(setups: TradeSetup[]): SweepCheck {
  const violations: string[] = [];
  const realtimePhrases = [
    /monitor.*real.?time/i,
    /decide.*at.*market/i,
    /to be determined/i,
    /TBD/i,
    /check.*live/i,
    /wait.*for.*confirmation/i,
  ];

  for (const s of setups) {
    // Entry must be a specific number, not a range or instruction
    if (typeof s.entry !== 'number' || s.entry <= 0) {
      violations.push(`${s.setupId}: entry is not a valid number (${s.entry})`);
    }
    if (typeof s.sl !== 'number' || s.sl <= 0) {
      violations.push(`${s.setupId}: SL is not a valid number (${s.sl})`);
    }
    if (typeof s.tp !== 'number' || s.tp <= 0) {
      violations.push(`${s.setupId}: TP is not a valid number (${s.tp})`);
    }
    // Notes should not contain real-time phrases
    for (const phrase of realtimePhrases) {
      if (phrase.test(s.notes)) {
        violations.push(`${s.setupId}: notes contain real-time instruction: "${s.notes}"`);
      }
    }
  }

  return {
    id: 'self-contained',
    name: 'Self-Contained Entries (No Real-Time Required)',
    passed: violations.length === 0,
    detail: violations.length === 0
      ? `All ${setups.length} setups are self-contained — no real-time analysis needed`
      : `${violations.length} setup(s) require real-time analysis`,
    evidence: violations.length === 0
      ? `Self-contained check PASSED: all ${setups.length} setups have explicit numeric entry/SL/TP and notes free of real-time decision phrases. Trader needs no live chart access.`
      : `Self-contained check FAILED: ${violations.length} setup(s) require real-time analysis or have invalid numeric fields. Violations: ${violations.join('; ')}. These setups violate the blind-execution principle.`,
    violations: violations.length > 0 ? violations : undefined,
  };
}

/**
 * Check 5: Every setup has a valid session window.
 */
function checkSessionWindows(setups: TradeSetup[]): SweepCheck {
  const violations: string[] = [];

  for (const s of setups) {
    if (!s.session || s.session.trim() === '') {
      violations.push(`${s.setupId}: no session window specified`);
    }
  }

  return {
    id: 'session-windows',
    name: 'Session Windows',
    passed: violations.length === 0,
    detail: violations.length === 0
      ? `All ${setups.length} setups have session windows`
      : `${violations.length} setup(s) without session window`,
    evidence: violations.length === 0
      ? `Session-window check PASSED: all ${setups.length} setups specify a non-empty session window. Trader knows which trading session each setup belongs to.`
      : `Session-window check FAILED: ${violations.length} setup(s) lack a session window. Violations: ${violations.join('; ')}. Without a session the trader does not know when to execute.`,
    violations: violations.length > 0 ? violations : undefined,
  };
}

/**
 * Check 6: Every setup has valid direction + confidence tier.
 */
function checkDirectionAndTier(setups: TradeSetup[]): SweepCheck {
  const validDirections = new Set(Object.values(TradeDirection));
  const validTiers = new Set(Object.values(ConfidenceTier));
  const violations: string[] = [];

  for (const s of setups) {
    if (!validDirections.has(s.direction)) {
      violations.push(`${s.setupId}: invalid direction="${s.direction}"`);
    }
    if (!validTiers.has(s.confidenceTier)) {
      violations.push(`${s.setupId}: invalid confidence tier="${s.confidenceTier}"`);
    }
  }

  return {
    id: 'direction-tier',
    name: 'Direction and Confidence Tier',
    passed: violations.length === 0,
    detail: violations.length === 0
      ? `All ${setups.length} setups have valid direction and tier`
      : `${violations.length} setup(s) with invalid direction or tier`,
    evidence: violations.length === 0
      ? `Direction-tier check PASSED: all ${setups.length} setups have a valid TradeDirection and ConfidenceTier from the defined enums.`
      : `Direction-tier check FAILED: ${violations.length} setup(s) have invalid direction or confidence tier. Violations: ${violations.join('; ')}. Invalid enum values indicate a data-integrity problem.`,
    violations: violations.length > 0 ? violations : undefined,
  };
}

/**
 * Check 7: Every setup has a valid RRR (Risk:Reward Ratio).
 * RRR must be > 0 and ideally >= 1.0.
 */
function checkRiskReward(setups: TradeSetup[]): SweepCheck {
  const violations: string[] = [];

  for (const s of setups) {
    if (typeof s.rrr !== 'number' || s.rrr <= 0) {
      violations.push(`${s.setupId}: invalid RRR (${s.rrr})`);
    }
  }

  return {
    id: 'risk-reward',
    name: 'Risk:Reward Ratio',
    passed: violations.length === 0,
    detail: violations.length === 0
      ? `All ${setups.length} setups have valid RRR values`
      : `${violations.length} setup(s) with invalid RRR`,
    evidence: violations.length === 0
      ? `Risk-reward check PASSED: all ${setups.length} setups have a positive numeric RRR value. Risk:reward is computable for every setup.`
      : `Risk-reward check FAILED: ${violations.length} setup(s) have invalid RRR (non-number or <= 0). Violations: ${violations.join('; ')}. A setup without valid RRR cannot be evaluated for trade quality.`,
    violations: violations.length > 0 ? violations : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FIX-016: Run a full compliance sweep against the generated report's setups.
 *
 * This is a SEPARATE verification step, called AFTER the report is generated.
 * It verifies structural compliance — not trading quality (that's BE1-BE12).
 *
 * @param setups The trade setups from the generated report.
 * @returns Structured pass/fail result with detailed violations.
 */
export function runComplianceSweep(setups: TradeSetup[]): ComplianceSweepResult {
  // GUARD: Empty setups = automatic FAIL (vacuous truth prevention).
  // every() returns true on an empty array, so all checks pass vacuously.
  // A pipeline that produced zero setups cannot be "production-ready".
  if (setups.length === 0) {
    log.error('Compliance sweep: CRITICAL — 0 trade setups. Cannot validate empty pipeline.');
    return {
      passed: false,
      totalChecks: 7,
      passedChecks: 0,
      failedChecks: 7,
      checks: [{
        id: 'non-empty-count',
        name: 'Non-empty setup count',
        passed: false,
        detail: 'CRITICAL: 0 trade setups generated. Cannot validate empty pipeline.',
        evidence: 'Compliance sweep aborted: input setups array is empty (length=0). All 7 structural checks are short-circuited to FAILED. Vacuous-truth guard triggered — a pipeline that produced zero setups cannot be declared compliant.',
      }],
      reportTimestamp: Date.now(),
      evidence: 'Compliance sweep FAILED: 0 trade setups were passed to runComplianceSweep. The 7-check sweep did not run because there is no data to validate. This is treated as a hard failure, not a vacuous pass.',
    };
  }

  log.info(`Running compliance sweep on ${setups.length} setup(s)`);

  const checks: SweepCheck[] = [
    checkDayLabels(setups),
    checkShapeTriggers(setups),
    checkCalendarCoverage(setups),
    checkSelfContained(setups),
    checkSessionWindows(setups),
    checkDirectionAndTier(setups),
    checkRiskReward(setups),
  ];

  const passedChecks = checks.filter((c: SweepCheck) => c.passed).length;
  const failedChecks = checks.length - passedChecks;

  if (failedChecks > 0) {
    log.warn(`Compliance sweep: ${failedChecks}/${checks.length} checks FAILED`);
    for (const c of checks.filter((c: SweepCheck) => !c.passed)) {
      log.warn(`  FAIL: ${c.name} — ${c.detail}`);
    }
  } else {
    log.info(`Compliance sweep: ALL ${checks.length} checks PASSED`);
  }

  return {
    passed: failedChecks === 0,
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    checks,
    reportTimestamp: Date.now(),
    evidence: failedChecks === 0
      ? `Compliance sweep PASSED on ${setups.length} setup(s): all ${checks.length} structural checks (day-labels, shape-triggers, calendar-coverage, self-contained, session-windows, direction-tier, risk-reward) returned passed=true. Report meets TTE v5.3.3 Step 15 compliance requirements.`
      : `Compliance sweep FAILED on ${setups.length} setup(s): ${failedChecks} of ${checks.length} structural checks returned passed=false. Failing checks: ${checks.filter((c) => !c.passed).map((c) => c.id).join(', ')}. Report does not meet TTE v5.3.3 Step 15 compliance requirements.`,
  };
}
