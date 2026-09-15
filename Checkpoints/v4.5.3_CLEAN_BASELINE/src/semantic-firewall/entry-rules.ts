/**
 * Entry Precision Rules — TS-1 through TS-9
 *
 * Advisory entry-type rules that classify and validate the entry method used
 * in each trade setup. These are WARN severity — they do not block trades but
 * provide diagnostic feedback on entry quality and pattern consistency.
 *
 * These rules are filtered through the 14 Zero-Tolerance rules (ZT-1..ZT-14)
 * which handle the hard enforcement. TS rules are advisory overlays that help
 * the trader understand which entry pattern their setup matches.
 */

import {
  TradeSetup,
  GuardrailResult,
  PIP_VALUE,
} from '../types.js';
import { RuleCheckContext } from './index.js';
import {
  ZONE_BOUNCE_BUFFER_PIPS, BOS_RETEST_MAX_DISTANCE_PIPS, PATTERN_MIN_RRR,
  EXHAUSTION_MAX_DISTANCE_PIPS, MOMENTUM_MAX_SL_PIPS,
  RANGE_BREAKOUT_MIN_SL_PIPS, RANGE_BREAKOUT_MIN_RRR,
  FIB_DEVIATION_THRESHOLD, MTF_MIN_CONFIDENCE,
  FIB_ENTRY_LEVELS, PIP_VALUE_DEFAULT, PCT_MULTIPLIER,
  FIB_RATIO_236, FIB_RATIO_382, FIB_RATIO_500, FIB_RATIO_618, FIB_RATIO_786,
} from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PIP VALUE HELPERS (inlined to avoid circular dependency)
// ═══════════════════════════════════════════════════════════════════════════════

function getPipValue(pair: string): number {
  return PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: check if notes match an entry type pattern
// ═══════════════════════════════════════════════════════════════════════════════

function notesContain(notes: string, keywords: string[]): boolean {
  const lower = notes.toLowerCase();
  return keywords.some((kw: string) => lower.includes(kw.toLowerCase()));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY TYPE DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Entry type classification — maps setup notes to the most likely entry type.
 * Used internally by the TS rules to determine which checks apply.
 */
export type EntryType =
  | 'zone_bounce'
  | 'bos_retest'
  | 'pattern_completion'
  | 'orderflow_exhaustion'
  | 'momentum_continuation'
  | 'range_breakout'
  | 'fib_confluence'
  | 'mtf_alignment'
  | 'news_reaction'
  | 'unknown';

/**
 * Classify a setup's entry type based on its notes and metadata.
 */
export function classifyEntryType(setup: TradeSetup): EntryType {
  const notes = setup.notes.toLowerCase();
  const shapeTrigger = setup.shapeTrigger.toLowerCase();

  // TS-1: Classic zone bounce
  if (notesContain(notes + ' ' + shapeTrigger, ['zone bounce', 'bounce off', 'reversal at zone', 'zone touch', 'reject from zone'])) {
    return 'zone_bounce';
  }

  // TS-2: Break of structure retest
  if (notesContain(notes + ' ' + shapeTrigger, ['bos retest', 'break of structure', 'retest', 'level break', 'structure break', 'bos'])) {
    return 'bos_retest';
  }

  // TS-3: Pattern completion
  if (notesContain(notes + ' ' + shapeTrigger, ['123 pattern', 'head and shoulder', 'double top', 'double bottom', 'pattern completion', 'wedge', 'triangle', 'flag', 'pennant'])) {
    return 'pattern_completion';
  }

  // TS-4: Order flow exhaustion
  if (notesContain(notes + ' ' + shapeTrigger, ['wick rejection', 'exhaustion', 'wick at level', 'long wick', 'tail', 'rejection wick', 'order flow'])) {
    return 'orderflow_exhaustion';
  }

  // TS-5: Momentum continuation
  if (notesContain(notes + ' ' + shapeTrigger, ['pullback', 'momentum continuation', 'trend pullback', 'ma bounce', 'moving average', 'ema touch', 'continuation'])) {
    return 'momentum_continuation';
  }

  // TS-6: Range breakout
  if (notesContain(notes + ' ' + shapeTrigger, ['range breakout', 'range break', 'breakout', 'range expansion'])) {
    return 'range_breakout';
  }

  // TS-7: Fib confluence entry
  if (notesContain(notes + ' ' + shapeTrigger, ['fib', 'fibonacci', 'fib level', '61.8', '78.6', '0.618', '0.786'])) {
    return 'fib_confluence';
  }

  // TS-8: Multi-timeframe alignment
  if (notesContain(notes + ' ' + shapeTrigger, ['multi timeframe', 'mtf', 'htf alignment', 'ltf alignment', 'timeframe alignment', 'all timeframes', '4h + 1h', 'daily + 4h'])) {
    return 'mtf_alignment';
  }

  // TS-9: News reaction
  if (notesContain(notes + ' ' + shapeTrigger, ['news reaction', 'news volatility', 'post-news', 'after news', 'nfp reaction', 'fomc reaction', 'news settle'])) {
    return 'news_reaction';
  }

  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TS-1 through TS-9 rule checks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TS-1: Classic zone bounce
 * Price touches zone and reverses. Entry at zone edge + 1 pip buffer.
 */
export function ts1ZoneBounce(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'zone_bounce') {
    return { rule: 'TS-1', passed: true, severity: 'INFO', message: 'Not a zone bounce entry', evidence: 'TS-1 zone bounce check skipped: setup does not match zone bounce entry pattern' };
  }

  // Verify entry is near zone edge (within 10 pips)
  if (ctx.zone) {
    const isLong = ctx.setup.direction === 'LONG';
    const zoneEdge = isLong ? ctx.zone.floor : ctx.zone.ceiling;
    const distancePips = Math.abs(ctx.setup.entry - zoneEdge) / getPipValue(ctx.setup.pair);
    const bufferOk = distancePips <= ZONE_BOUNCE_BUFFER_PIPS; // 1 pip buffer + 2 pip tolerance

    if (!bufferOk) {
      return {
        rule: 'TS-1',
        passed: false,
        severity: 'WARN',
        message: `Zone bounce entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from zone edge ${zoneEdge} — should be within 1 pip buffer`,
        evidence: `TS-1 zone bounce check failed: entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from zone edge ${zoneEdge}, exceeding the ${ZONE_BOUNCE_BUFFER_PIPS}p buffer tolerance`,
      };
    }

    // H-04: Validate against 4-point entry precision if available.
    // Per TTE v5.3.3 Section 7.1, the entry (and scaled entries entry1/2/3)
    // must coincide with one of the precision points: frontEdge, middleZone,
    // or backEdge of the zone.
    if (ctx.setup.entryPrecision) {
      const ep = ctx.setup.entryPrecision;
      const pip = getPipValue(ctx.setup.pair);
      const tolerancePips = ZONE_BOUNCE_BUFFER_PIPS;
      const precisionPoints = [
        { name: 'frontEdge', price: ep.frontEdge },
        { name: 'middleZone', price: ep.middleZone },
        { name: 'backEdge', price: ep.backEdge },
      ];
      // Check primary entry and scaled entries against precision points
      const entriesToCheck = [
        ctx.setup.entry,
        ctx.setup.entry1,
        ctx.setup.entry2,
        ctx.setup.entry3,
      ].filter((e): e is number => e !== undefined);

      for (const entryPrice of entriesToCheck) {
        const match = precisionPoints.find(
          (p) => Math.abs(p.price - entryPrice) / pip <= tolerancePips,
        );
        if (!match) {
          return {
            rule: 'TS-1',
            passed: false,
            severity: 'WARN',
            message: `Entry ${entryPrice} does not coincide with any 4-point precision level ` +
              `(front=${ep.frontEdge}, mid=${ep.middleZone}, back=${ep.backEdge}) within ${tolerancePips}p`,
            evidence: `TS-1 H-04 precision check failed: entry ${entryPrice} does not align with any 4-point precision level (frontEdge=${ep.frontEdge}, middleZone=${ep.middleZone}, backEdge=${ep.backEdge}) within ${tolerancePips}p tolerance`,
          };
        }
      }
    }

    return {
      rule: 'TS-1',
      passed: true,
      severity: 'INFO',
      message: `Zone bounce entry at zone edge ${zoneEdge} (distance: ${distancePips.toFixed(1)}p)`,
      evidence: `TS-1 zone bounce check passed: entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from zone edge ${zoneEdge}, within the ${ZONE_BOUNCE_BUFFER_PIPS}p buffer tolerance`,
    };
  }

  return {
    rule: 'TS-1',
    passed: true,
    severity: 'INFO',
    message: 'Zone bounce pattern — but no zone context for verification',
    evidence: 'TS-1 zone bounce check passed with caveat: zone bounce pattern detected but no zone context available to verify entry precision',
  };
}

/**
 * TS-2: Break of structure retest
 * Price breaks level, retests, then continues. Entry at retest.
 */
export function ts2BosRetest(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'bos_retest') {
    return { rule: 'TS-2', passed: true, severity: 'INFO', message: 'Not a BOS retest entry', evidence: 'TS-2 BOS retest check skipped: setup does not match break-of-structure retest entry pattern' };
  }

  // Check that entry is not too far from spot (should be at retest level, near spot)
  const distancePips = Math.abs(ctx.setup.entry - ctx.spotPrice) / getPipValue(ctx.setup.pair);
  if (distancePips > BOS_RETEST_MAX_DISTANCE_PIPS) {
    return {
      rule: 'TS-2',
      passed: false,
      severity: 'WARN',
      message: `BOS retest entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from spot ${ctx.spotPrice} — retest entry should be near current price`,
      evidence: `TS-2 BOS retest check failed: entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from spot ${ctx.spotPrice}, exceeding the ${BOS_RETEST_MAX_DISTANCE_PIPS}p maximum distance for a valid retest`,
    };
  }

  return {
    rule: 'TS-2',
    passed: true,
    severity: 'INFO',
    message: `BOS retest entry at ${ctx.setup.entry} (${distancePips.toFixed(1)}p from spot)`,
    evidence: `TS-2 BOS retest check passed: entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from spot ${ctx.spotPrice}, within the ${BOS_RETEST_MAX_DISTANCE_PIPS}p retest distance tolerance`,
  };
}

/**
 * TS-3: Pattern completion
 * 123 pattern, head and shoulders, etc. Entry at pattern completion.
 */
export function ts3PatternCompletion(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'pattern_completion') {
    return { rule: 'TS-3', passed: true, severity: 'INFO', message: 'Not a pattern completion entry', evidence: 'TS-3 pattern completion check skipped: setup does not match pattern completion entry pattern' };
  }

  // Verify the setup has a shape code that matches pattern completion
  const patternShapes = ['WL', 'R', 'WLS', 'RWL'];
  if (!patternShapes.includes(ctx.setup.shapeAlignment)) {
    return {
      rule: 'TS-3',
      passed: false,
      severity: 'WARN',
      message: `Pattern completion entry but shape alignment is ${ctx.setup.shapeAlignment} — expected reversal/whiplash shape`,
      evidence: `TS-3 pattern completion check failed: shape alignment ${ctx.setup.shapeAlignment} does not match expected reversal/whiplash shapes (${patternShapes.join(', ')})`,
    };
  }

  // Check RRR is reasonable (patterns typically need room)
  if (ctx.setup.rrr < PATTERN_MIN_RRR) {
    return {
      rule: 'TS-3',
      passed: false,
      severity: 'WARN',
      message: `Pattern completion RRR ${ctx.setup.rrr} < 2.0 — pattern entries typically need higher RRR`,
      evidence: `TS-3 pattern completion check failed: RRR ${ctx.setup.rrr} is below the ${PATTERN_MIN_RRR} minimum required for pattern completion entries`,
    };
  }

  return {
    rule: 'TS-3',
    passed: true,
    severity: 'INFO',
    message: `Pattern completion with shape ${ctx.setup.shapeAlignment}, RRR ${ctx.setup.rrr}`,
    evidence: `TS-3 pattern completion check passed: shape alignment ${ctx.setup.shapeAlignment} matches expected reversal/whiplash shapes and RRR ${ctx.setup.rrr} >= ${PATTERN_MIN_RRR} minimum`,
  };
}

/**
 * TS-4: Order flow exhaustion
 * Wick rejected at key level. Entry at wick tip + 1 pip buffer.
 */
export function ts4OrderFlowExhaustion(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'orderflow_exhaustion') {
    return { rule: 'TS-4', passed: true, severity: 'INFO', message: 'Not an order flow exhaustion entry', evidence: 'TS-4 order flow exhaustion check skipped: setup does not match order flow exhaustion entry pattern' };
  }

  // Verify entry is at an extreme (near a zone edge — the wick tip)
  if (ctx.zone) {
    const isLong = ctx.setup.direction === 'LONG';
    const zoneEdge = isLong ? ctx.zone.floor : ctx.zone.ceiling;
    const distancePips = Math.abs(ctx.setup.entry - zoneEdge) / getPipValue(ctx.setup.pair);

    if (distancePips > EXHAUSTION_MAX_DISTANCE_PIPS) {
      return {
        rule: 'TS-4',
        passed: false,
        severity: 'WARN',
        message: `Exhaustion entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from zone edge ${zoneEdge} — should be at wick tip with 1 pip buffer`,
        evidence: `TS-4 order flow exhaustion check failed: entry ${ctx.setup.entry} is ${distancePips.toFixed(1)}p from zone edge ${zoneEdge}, exceeding the ${EXHAUSTION_MAX_DISTANCE_PIPS}p maximum distance for a valid exhaustion wick`,
      };
    }
  }

  return {
    rule: 'TS-4',
    passed: true,
    severity: 'INFO',
    message: `Order flow exhaustion entry at ${ctx.setup.entry}`,
    evidence: `TS-4 order flow exhaustion check passed: entry ${ctx.setup.entry} is within the ${EXHAUSTION_MAX_DISTANCE_PIPS}p tolerance of the zone edge wick tip`,
  };
}

/**
 * TS-5: Momentum continuation
 * Strong trend pullback to MA/zone. Entry at pullback edge.
 */
export function ts5MomentumContinuation(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'momentum_continuation') {
    return { rule: 'TS-5', passed: true, severity: 'INFO', message: 'Not a momentum continuation entry', evidence: 'TS-5 momentum continuation check skipped: setup does not match momentum continuation entry pattern' };
  }

  // For momentum continuation, the SL is typically wider — check it's reasonable
  if (ctx.setup.slPips > MOMENTUM_MAX_SL_PIPS) {
    return {
      rule: 'TS-5',
      passed: false,
      severity: 'WARN',
      message: `Momentum continuation SL ${ctx.setup.slPips}p is wide — verify pullback zone is valid`,
      evidence: `TS-5 momentum continuation check failed: SL ${ctx.setup.slPips}p exceeds the ${MOMENTUM_MAX_SL_PIPS}p maximum — pullback zone may not be valid`,
    };
  }

  return {
    rule: 'TS-5',
    passed: true,
    severity: 'INFO',
    message: `Momentum continuation entry at ${ctx.setup.entry}, SL ${ctx.setup.slPips}p`,
    evidence: `TS-5 momentum continuation check passed: SL ${ctx.setup.slPips}p is within the ${MOMENTUM_MAX_SL_PIPS}p maximum for momentum continuation entries`,
  };
}

/**
 * TS-6: Range breakout
 * Price breaks range with conviction. Entry at breakout level + buffer.
 */
export function ts6RangeBreakout(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'range_breakout') {
    return { rule: 'TS-6', passed: true, severity: 'INFO', message: 'Not a range breakout entry', evidence: 'TS-6 range breakout check skipped: setup does not match range breakout entry pattern' };
  }

  // Breakout entries should have reasonable SL placement (not too tight, not too wide)
  if (ctx.setup.slPips < RANGE_BREAKOUT_MIN_SL_PIPS) {
    return {
      rule: 'TS-6',
      passed: false,
      severity: 'WARN',
      message: `Range breakout SL ${ctx.setup.slPips}p too tight — range breakouts need room for false break`,
      evidence: `TS-6 range breakout check failed: SL ${ctx.setup.slPips}p is below the ${RANGE_BREAKOUT_MIN_SL_PIPS}p minimum — range breakouts need room for false break`,
    };
  }

  // Breakout entries should have reasonable RRR
  if (ctx.setup.rrr < RANGE_BREAKOUT_MIN_RRR) {
    return {
      rule: 'TS-6',
      passed: false,
      severity: 'WARN',
      message: `Range breakout RRR ${ctx.setup.rrr} < 1.5 — breakout entries should target meaningful move`,
      evidence: `TS-6 range breakout check failed: RRR ${ctx.setup.rrr} is below the ${RANGE_BREAKOUT_MIN_RRR} minimum — breakout entries should target a meaningful move`,
    };
  }

  return {
    rule: 'TS-6',
    passed: true,
    severity: 'INFO',
    message: `Range breakout entry RRR ${ctx.setup.rrr}, SL ${ctx.setup.slPips}p`,
    evidence: `TS-6 range breakout check passed: SL ${ctx.setup.slPips}p >= ${RANGE_BREAKOUT_MIN_SL_PIPS}p minimum and RRR ${ctx.setup.rrr} >= ${RANGE_BREAKOUT_MIN_RRR} minimum`,
  };
}

/**
 * TS-7: Fib confluence entry
 * Entry at fib level (61.8, 78.6) that aligns with zone.
 */
export function ts7FibConfluenceEntry(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'fib_confluence') {
    return { rule: 'TS-7', passed: true, severity: 'INFO', message: 'Not a fib confluence entry', evidence: 'TS-7 fib confluence check skipped: setup does not match fib confluence entry pattern' };
  }

  // Verify entry is at a common fib level (61.8%, 78.6%) relative to the zone
  // This is a heuristic check — full fib spiderweb is in fib-spiderweb.ts
  if (ctx.zone) {
    const zoneRange = ctx.zone.ceiling - ctx.zone.floor;
    if (zoneRange > 0) {
      const entryOffset = (ctx.setup.entry - ctx.zone.floor) / zoneRange;
      const fibLevels: number[] = [...FIB_ENTRY_LEVELS];
      const closestFib = fibLevels.reduce((prev: number, curr: number) =>
        Math.abs(entryOffset - curr) < Math.abs(entryOffset - prev) ? curr : prev,
      );
      const deviation = Math.abs(entryOffset - closestFib);

      if (deviation > FIB_DEVIATION_THRESHOLD) {
        return {
          rule: 'TS-7',
          passed: false,
          severity: 'WARN',
          message: `Fib confluence entry at ${(entryOffset * PCT_MULTIPLIER).toFixed(0)}% of zone — closest fib ${(closestFib * PCT_MULTIPLIER).toFixed(1)}% deviates by ${(deviation * PCT_MULTIPLIER).toFixed(0)}%`,
          evidence: `TS-7 fib confluence check failed: entry offset ${(entryOffset * PCT_MULTIPLIER).toFixed(0)}% deviates ${(deviation * PCT_MULTIPLIER).toFixed(0)}% from closest fib level ${(closestFib * PCT_MULTIPLIER).toFixed(1)}%, exceeding the ${(FIB_DEVIATION_THRESHOLD * PCT_MULTIPLIER).toFixed(0)}% threshold`,
        };
      }

      return {
        rule: 'TS-7',
        passed: true,
        severity: 'INFO',
        message: `Fib confluence entry at ${(closestFib * PCT_MULTIPLIER).toFixed(1)}% fib level (deviation ${(deviation * PCT_MULTIPLIER).toFixed(1)}%)`,
        evidence: `TS-7 fib confluence check passed: entry aligns with ${(closestFib * PCT_MULTIPLIER).toFixed(1)}% fib level with ${(deviation * PCT_MULTIPLIER).toFixed(1)}% deviation, within the ${(FIB_DEVIATION_THRESHOLD * PCT_MULTIPLIER).toFixed(0)}% threshold`,
      };
    }
  }

  return {
    rule: 'TS-7',
    passed: true,
    severity: 'INFO',
    message: 'Fib confluence pattern identified',
    evidence: 'TS-7 fib confluence check passed: fib confluence pattern identified but no zone context available for fib level verification',
  };
}

/**
 * TS-8: Multi-timeframe alignment
 * Entry when HTF and LTF both show same direction signal.
 */
export function ts8MtfAlignment(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'mtf_alignment') {
    return { rule: 'TS-8', passed: true, severity: 'INFO', message: 'Not an MTF alignment entry', evidence: 'TS-8 MTF alignment check skipped: setup does not match multi-timeframe alignment entry pattern' };
  }

  // MTF alignment should have higher confidence
  if (ctx.setup.confidence < MTF_MIN_CONFIDENCE) {
    return {
      rule: 'TS-8',
      passed: false,
      severity: 'WARN',
      message: `MTF alignment entry confidence ${ctx.setup.confidence} < 70 — multi-timeframe setups should have higher confidence`,
      evidence: `TS-8 MTF alignment check failed: confidence ${ctx.setup.confidence} is below the ${MTF_MIN_CONFIDENCE} minimum required for multi-timeframe alignment entries`,
    };
  }

  return {
    rule: 'TS-8',
    passed: true,
    severity: 'INFO',
    message: `MTF alignment entry with confidence ${ctx.setup.confidence}`,
    evidence: `TS-8 MTF alignment check passed: confidence ${ctx.setup.confidence} >= ${MTF_MIN_CONFIDENCE} minimum for multi-timeframe alignment entries`,
  };
}

/**
 * TS-9: News reaction
 * Entry after news volatility settles, at value area edge.
 */
export function ts9NewsReaction(ctx: RuleCheckContext): GuardrailResult {
  const entryType = classifyEntryType(ctx.setup);
  if (entryType !== 'news_reaction') {
    return { rule: 'TS-9', passed: true, severity: 'INFO', message: 'Not a news reaction entry', evidence: 'TS-9 news reaction check skipped: setup does not match news reaction entry pattern' };
  }

  // News reaction entries should not be within the red folder window
  if (ctx.redFolderActive) {
    return {
      rule: 'TS-9',
      passed: false,
      severity: 'WARN',
      message: 'News reaction entry attempted during active news exclusion window — wait for volatility to settle',
      evidence: 'TS-9 news reaction check failed: red folder news window is currently active — entry must wait for volatility to settle',
    };
  }

  // Verify notes document the news event
  if (!ctx.setup.notes.toLowerCase().includes('value area') &&
      !ctx.setup.notes.toLowerCase().includes('settle') &&
      !ctx.setup.notes.toLowerCase().includes('volatility')) {
    return {
      rule: 'TS-9',
      passed: false,
      severity: 'WARN',
      message: 'News reaction entry should document the value area edge and post-news volatility assessment',
      evidence: 'TS-9 news reaction check failed: setup notes do not document value area edge, settle, or volatility assessment for post-news entry',
    };
  }

  return {
    rule: 'TS-9',
    passed: true,
    severity: 'INFO',
    message: 'News reaction entry with documented post-news value area',
    evidence: 'TS-9 news reaction check passed: no active red folder window and setup notes document post-news value area/volatility assessment',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// META-CHECK: run all entry precision rules
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run all 9 entry precision rules against the context.
 * Returns an array of GuardrailResult, one per rule.
 */
export function checkEntryPrecision(ctx: RuleCheckContext): GuardrailResult[] {
  return [
    ts1ZoneBounce(ctx),
    ts2BosRetest(ctx),
    ts3PatternCompletion(ctx),
    ts4OrderFlowExhaustion(ctx),
    ts5MomentumContinuation(ctx),
    ts6RangeBreakout(ctx),
    ts7FibConfluenceEntry(ctx),
    ts8MtfAlignment(ctx),
    ts9NewsReaction(ctx),
  ];
}
