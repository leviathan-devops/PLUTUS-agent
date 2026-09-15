/**
 * FilterCheckpoint — Pair and Notional filtering applied as a pipeline checkpoint.
 *
 * TTE v5.3.3 Compliance Checks 1 and 2:
 *   CHECK 1 (Pair Filter): OTC summary includes EUR/USD, GBP/USD, AUD/USD only.
 *     DXY is analyzed separately. Any other pair is excluded.
 *   CHECK 2 (Notional Filter): Three-tier classification:
 *     TIER 1 — CRITICAL OPTION WALL:  >= $1.5B
 *     TIER 2 — SIGNIFICANT MAGNET:    $850M - $1.499B
 *     TIER 3 — EXCLUDED:              < $850M
 *
 * Applied as a checkpoint between data harvesting and pillar scoring so
 * irrelevant data cannot corrupt zone pressure scores.
 *
 * FIX-002 / GAP-002 — CRITICAL. Depends on FIX-001.
 */

import type { OptionStrike } from '../clients/investinglive-client.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('FilterCheckpoint');

// ── TTE Thresholds ──

export const CRITICAL_THRESHOLD = 1.5;     // >= $1.5B = CRITICAL WALL
export const SIGNIFICANT_THRESHOLD = 0.85;  // >= $850M = SIGNIFICANT MAGNET

/** Pairs allowed in the OTC summary (Check 1). */
export const ALLOWED_OTC_PAIRS = new Set(['EUR/USD', 'GBP/USD', 'AUD/USD']);

// ── Types ──

export type NotionalTier = 'CRITICAL_WALL' | 'SIGNIFICANT_MAGNET' | 'EXCLUDED';
export type FilterDecision = 'PASS' | 'FILTERED_PAIR' | 'FILTERED_NOTIONAL';

export interface AuditLine {
  strike: OptionStrike;
  pairDecision: FilterDecision;
  notionalTier: NotionalTier;
  reason: string;
}

export interface CheckpointResult {
  passed: OptionStrike[];
  filtered: OptionStrike[];
  auditLines: AuditLine[];
  summary: {
    totalInput: number;
    totalPassed: number;
    criticalWalls: number;
    significantMagnets: number;
    excludedByPair: number;
    excludedByNotional: number;
  };
}

// ── Engine ──

export class FilterCheckpoint {

  /**
   * Apply pair + notional filters to a list of option strikes.
   * Returns passed strikes (for pillar scoring), filtered strikes,
   * and a full audit trail.
   */
  apply(strikes: OptionStrike[]): CheckpointResult {
    const auditLines: AuditLine[] = [];
    const passed: OptionStrike[] = [];
    const filtered: OptionStrike[] = [];

    for (const strike of strikes) {
      const tier = this.classifyNotional(strike.notional);
      const pairOk = ALLOWED_OTC_PAIRS.has(strike.pair);

      let decision: FilterDecision;
      let reason: string;

      if (!pairOk) {
        decision = 'FILTERED_PAIR';
        reason = `Pair ${strike.pair} not in OTC allowed list [EUR/USD, GBP/USD, AUD/USD]`;
      } else if (tier === 'EXCLUDED') {
        decision = 'FILTERED_NOTIONAL';
        reason = `Notional $${(strike.notional * 1000).toFixed(0)}M < $850M threshold`;
      } else {
        decision = 'PASS';
        reason = tier === 'CRITICAL_WALL'
          ? `Critical Wall: $${strike.notional.toFixed(2)}B >= $1.5B`
          : `Significant Magnet: $${strike.notional.toFixed(3)}B >= $850M`;
      }

      auditLines.push({ strike, pairDecision: decision, notionalTier: tier, reason });

      if (decision === 'PASS') {
        passed.push(strike);
      } else {
        filtered.push(strike);
      }
    }

    const result: CheckpointResult = {
      passed, filtered, auditLines,
      summary: {
        totalInput: strikes.length,
        totalPassed: passed.length,
        criticalWalls: passed.filter((s: OptionStrike) => this.classifyNotional(s.notional) === 'CRITICAL_WALL').length,
        significantMagnets: passed.filter((s: OptionStrike) => this.classifyNotional(s.notional) === 'SIGNIFICANT_MAGNET').length,
        excludedByPair: auditLines.filter((a: AuditLine) => a.pairDecision === 'FILTERED_PAIR').length,
        excludedByNotional: auditLines.filter((a: AuditLine) => a.pairDecision === 'FILTERED_NOTIONAL').length,
      },
    };

    log.info(
      `FilterCheckpoint: ${result.summary.totalInput} input -> ${result.summary.totalPassed} passed ` +
      `(${result.summary.criticalWalls} critical, ${result.summary.significantMagnets} significant). ` +
      `Excluded: ${result.summary.excludedByPair} by pair, ${result.summary.excludedByNotional} by notional.`
    );

    return result;
  }

  /**
   * Classify a notional value (in billions USD) into one of three tiers.
   */
  classifyNotional(notionalB: number): NotionalTier {
    if (notionalB >= CRITICAL_THRESHOLD) return 'CRITICAL_WALL';
    if (notionalB >= SIGNIFICANT_THRESHOLD) return 'SIGNIFICANT_MAGNET';
    return 'EXCLUDED';
  }

  /**
   * Format the audit trail as human-readable lines for the compliance report.
   */
  formatAuditLines(result: CheckpointResult): string[] {
    return result.auditLines.map((a: AuditLine) =>
      `${a.strike.pair}@${a.strike.strike} | ${a.notionalTier} | ${a.pairDecision} | ${a.reason}`
    );
  }
}
