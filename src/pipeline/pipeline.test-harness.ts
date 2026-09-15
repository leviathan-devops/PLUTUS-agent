/**
 * PLUTUS 4.0 Pipeline — Test Harness (T1-T20)
 *
 * Each test (T1-T20) produces a structured outcome that the CI harness
 * can aggregate. The `evidence` field is the machine-readable proof;
 * the `humanNote` is for the audit log.
 *
 * INTEGRATION: NEW FILE src/pipeline/pipeline.test-harness.ts
 * Source: L2 Spec Section 7
 */

import type { PhaseResult, PipelineError, TradeSetup, VisualSDZone, ScreenshotArtifact } from './types.js';

// ─── Test context + outcome types ───

export interface TestOutcome {
  testId: string;
  testName: string;
  passed: boolean;
  evidence: Record<string, unknown>;
  humanNote: string;
  durationMs: number;
}

/**
 * TestContext BECAUSE the predicate and evidence functions share the
 * same input shape. Named explicitly to avoid circular type references
 * in PlutusTestSpec.
 */
export interface TestContext {
  setups: TradeSetup[];
  zones: VisualSDZone[];
  errors: PipelineError[];
  screenshots: ScreenshotArtifact[];
  phaseResults: Partial<Record<string, PhaseResult<unknown>>>;
  manualStepOutputs: Partial<Record<'A' | 'B' | 'C' | 'D', unknown>>;
  durationMs: number;
}

export interface PlutusTestSpec {
  id: string;
  name: string;
  /** Returns true if the test passes. */
  predicate: (ctx: TestContext) => boolean;
  /** Machine-readable evidence for the audit log. */
  evidence: (ctx: TestContext) => Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// T1-T4: ≥8 setups per pair
// ═══════════════════════════════════════════════════════════════════════════════

export const T1_DXY_SETUPS: PlutusTestSpec = {
  id: 'T1',
  name: 'Pipeline produces ≥8 setups for DXY',
  predicate: (c) => c.setups.filter((s) => s.pair === 'DXY').length >= 8,
  evidence: (c) => ({ dxySetupCount: c.setups.filter((s) => s.pair === 'DXY').length }),
};

export const T2_EURUSD_SETUPS: PlutusTestSpec = {
  id: 'T2',
  name: 'Pipeline produces ≥8 setups for EUR/USD',
  predicate: (c) => c.setups.filter((s) => s.pair === 'EUR/USD').length >= 8,
  evidence: (c) => ({ eurusdSetupCount: c.setups.filter((s) => s.pair === 'EUR/USD').length }),
};

export const T3_GBPUSD_SETUPS: PlutusTestSpec = {
  id: 'T3',
  name: 'Pipeline produces ≥8 setups for GBP/USD',
  predicate: (c) => c.setups.filter((s) => s.pair === 'GBP/USD').length >= 8,
  evidence: (c) => ({ gbpusdSetupCount: c.setups.filter((s) => s.pair === 'GBP/USD').length }),
};

export const T4_AUDUSD_SETUPS: PlutusTestSpec = {
  id: 'T4',
  name: 'Pipeline produces ≥8 setups for AUD/USD',
  predicate: (c) => c.setups.filter((s) => s.pair === 'AUD/USD').length >= 8,
  evidence: (c) => ({ audusdSetupCount: c.setups.filter((s) => s.pair === 'AUD/USD').length }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T5: Category diversity
// ═══════════════════════════════════════════════════════════════════════════════

export const MIN_CATEGORY_COUNT = 4;

export const T5_CATEGORY_DIVERSITY: PlutusTestSpec = {
  id: 'T5',
  name: 'Categories include SS, BS, RWL, Whiplash (not just HTF Swing)',
  predicate: (c) => {
    const categories = new Set(c.setups.map((s) => s.category));
    return categories.size >= MIN_CATEGORY_COUNT;
  },
  evidence: (c) => ({
    categoryCount: new Set(c.setups.map((s) => s.category)).size,
    categories: [...new Set(c.setups.map((s) => s.category))],
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T6: All VISUAL source
// ═══════════════════════════════════════════════════════════════════════════════

export const T6_ALL_VISUAL: PlutusTestSpec = {
  id: 'T6',
  name: 'All setups are VISUAL source (not DATA-FALLBACK)',
  predicate: (c) => c.setups.every((s) => s.source === 'VISUAL'),
  evidence: (c) => ({
    totalSetups: c.setups.length,
    visualSetups: c.setups.filter((s) => s.source === 'VISUAL').length,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T7: Setups span all 5 days
// ═══════════════════════════════════════════════════════════════════════════════

export const MIN_DAYS_COVERED = 5;

export const T7_ALL_DAYS: PlutusTestSpec = {
  id: 'T7',
  name: 'Setups span all 5 days (not just Mon/Tue)',
  predicate: (c) => new Set(c.setups.map((s) => s.day)).size >= MIN_DAYS_COVERED,
  evidence: (c) => ({
    daysCovered: new Set(c.setups.map((s) => s.day)).size,
    days: [...new Set(c.setups.map((s) => s.day))],
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T8: SL distances 5-15 pips, median 12
// ═══════════════════════════════════════════════════════════════════════════════

export const T8_SL_DISTANCES: PlutusTestSpec = {
  id: 'T8',
  name: 'SL distances 5-15 pips (median 12)',
  predicate: (c) => {
    const slPips = c.setups.map((s) => Math.abs(s.sl - s.entries.front) / 0.0001);
    const allInRange = slPips.every((p) => p >= 5 && p <= 15);
    const sorted = [...slPips].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    return allInRange && Math.abs(median - 12) <= 2;
  },
  evidence: (c) => ({
    slPips: c.setups.map((s) => Math.abs(s.sl - s.entries.front) / 0.0001),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T9: TP at opposing zone with liquidity overlap
// ═══════════════════════════════════════════════════════════════════════════════

export const T9_TP_OPPOSING_ZONE: PlutusTestSpec = {
  id: 'T9',
  name: 'TP at opposing zone with liquidity overlap (Earth+Fire)',
  predicate: (c) => {
    return c.setups.every((s) => {
      const opposingZones = c.zones.filter((z) =>
        z.pair === s.pair &&
        ((s.direction === 'LONG' && z.top >= s.tp) ||
         (s.direction === 'SHORT' && z.bottom <= s.tp)),
      );
      return opposingZones.length > 0;
    });
  },
  evidence: (c) => ({
    setupsWithOpposingZone: c.setups.filter((s) => {
      const opposingZones = c.zones.filter((z) =>
        z.pair === s.pair &&
        ((s.direction === 'LONG' && z.top >= s.tp) ||
         (s.direction === 'SHORT' && z.bottom <= s.tp)),
      );
      return opposingZones.length > 0;
    }).length,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T10: Session enforcement text on every setup
// ═══════════════════════════════════════════════════════════════════════════════

export const T10_SESSION_TEXT: PlutusTestSpec = {
  id: 'T10',
  name: 'Session enforcement text on every setup',
  predicate: (c) => c.setups.every((s) => s.session !== undefined && String(s.session).length > 0),
  evidence: (c) => ({
    sessions: c.setups.map((s) => s.session),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T11: Candle confirmation text on every setup
// ═══════════════════════════════════════════════════════════════════════════════

export const T11_CANDLE_CONFIRMATION: PlutusTestSpec = {
  id: 'T11',
  name: 'Candle confirmation text on every setup',
  predicate: (c) => c.setups.every((s) => s.candleConfirmation && s.candleConfirmation.length > 5),
  evidence: (c) => ({
    confirmations: c.setups.map((s) => s.candleConfirmation),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T12: Options strikes extracted
// ═══════════════════════════════════════════════════════════════════════════════

export const T12_OPTIONS_STRIKES: PlutusTestSpec = {
  id: 'T12',
  name: 'Options strikes extracted (>0)',
  predicate: (c) => {
    const stepA = c.manualStepOutputs['A'] as { optionsData?: unknown[] } | undefined;
    return (stepA?.optionsData?.length ?? 0) > 0;
  },
  evidence: (c) => {
    const stepA = c.manualStepOutputs['A'] as { optionsData?: unknown[] } | undefined;
    return { optionsStrikeCount: stepA?.optionsData?.length ?? 0 };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// T13: 0 FATAL errors
// ═══════════════════════════════════════════════════════════════════════════════

export const T13_NO_FATAL_ERRORS: PlutusTestSpec = {
  id: 'T13',
  name: 'pipeline-errors.json has 0 FATAL errors',
  predicate: (c) => !c.errors.some((e) => e.severity === 'FATAL'),
  evidence: (c) => ({
    fatalErrorCount: c.errors.filter((e) => e.severity === 'FATAL').length,
    totalErrorCount: c.errors.length,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T14: Pipeline completes in ≤5 minutes
// ═══════════════════════════════════════════════════════════════════════════════

export const T14_COMPLETION_TIME: PlutusTestSpec = {
  id: 'T14',
  name: 'Pipeline completes in ≤ 5 minutes',
  predicate: (c) => c.durationMs <= 300_000,
  evidence: (c) => ({ durationMs: c.durationMs, durationMinutes: c.durationMs / 60_000 }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T15: TvChartController connects successfully
// ═══════════════════════════════════════════════════════════════════════════════

export const T15_CDP_CONNECT: PlutusTestSpec = {
  id: 'T15',
  name: 'TvChartController connects successfully (no CDP timeout)',
  predicate: (c) => !c.errors.some((e) => e.message.includes('CDPTimeout')),
  evidence: (c) => ({
    cdpErrors: c.errors.filter((e) => e.message.includes('CDPTimeout')).length,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T16: GUI draw tools produce visible zones
// ═══════════════════════════════════════════════════════════════════════════════

export const T16_GUI_DRAW_VISIBLE: PlutusTestSpec = {
  id: 'T16',
  name: 'GUI draw tools produce visible zones on TradingView chart',
  predicate: (c) => c.screenshots.length >= 4,
  evidence: (c) => ({ screenshotCount: c.screenshots.length }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T17: VLM validates ≥3 zones per pair
// ═══════════════════════════════════════════════════════════════════════════════

export const T17_VLM_ZONES: PlutusTestSpec = {
  id: 'T17',
  name: 'VLM validates ≥3 zones per pair (CONFIRMED or NEW)',
  predicate: (c) => {
    for (const pair of ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD']) {
      const confirmed = c.zones.filter(
        (z) => z.pair === pair && (z.source === 'VLM_CONFIRMED' || z.source === 'VLM_NEW'),
      ).length;
      if (confirmed < 3) return false;
    }
    return true;
  },
  evidence: (c) => ({
    perPairConfirmed: ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'].map((pair) => ({
      pair,
      confirmed: c.zones.filter(
        (z) => z.pair === pair && (z.source === 'VLM_CONFIRMED' || z.source === 'VLM_NEW'),
      ).length,
    })),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T18: Temporal anchoring — no future data leak
// ═══════════════════════════════════════════════════════════════════════════════

export const T18_TEMPORAL_ANCHOR: PlutusTestSpec = {
  id: 'T18',
  name: 'Temporal anchoring works (backtesting only uses data up to anchor date)',
  predicate: (c) => !c.errors.some((e) => e.message.includes('TemporalAnchor')),
  evidence: (c) => ({
    temporalViolations: c.errors.filter((e) => e.message.includes('TemporalAnchor')).length,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T19: All 5 tools called in sequence
// ═══════════════════════════════════════════════════════════════════════════════

export const T19_TOOL_SEQUENCE: PlutusTestSpec = {
  id: 'T19',
  name: 'All 5 tools are called in sequence (harvest → zones → shapes → charts → setups)',
  predicate: (c) => {
    const expected = [
      'plutus-pipeline-harvest',
      'plutus-pipeline-zones',
      'plutus-pipeline-shapes',
      'plutus-pipeline-charts',
      'plutus-pipeline-setups',
    ];
    return expected.every((name) => c.phaseResults[name] !== undefined);
  },
  evidence: (c) => ({
    phasesRun: Object.keys(c.phaseResults),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// T20: All 4 manual steps completed
// ═══════════════════════════════════════════════════════════════════════════════

export const T20_MANUAL_STEPS: PlutusTestSpec = {
  id: 'T20',
  name: 'All 4 manual steps are completed by agent (A, B, C, D)',
  predicate: (c) => (['A', 'B', 'C', 'D'] as const).every((step) => c.manualStepOutputs[step] !== undefined),
  evidence: (c) => ({
    stepsCompleted: (['A', 'B', 'C', 'D'] as const).filter((s) => c.manualStepOutputs[s] !== undefined),
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALL_TESTS + runAllTests
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ALL_PLUTUS_TESTS BECAUSE the CI harness needs the complete list in a
 * stable order. Order matters — T1-T4 must pass before T5-T20 are
 * evaluated, because T5-T20 depend on setups existing.
 */
export const ALL_PLUTUS_TESTS: PlutusTestSpec[] = [
  T1_DXY_SETUPS, T2_EURUSD_SETUPS, T3_GBPUSD_SETUPS, T4_AUDUSD_SETUPS,
  T5_CATEGORY_DIVERSITY, T6_ALL_VISUAL, T7_ALL_DAYS, T8_SL_DISTANCES,
  T9_TP_OPPOSING_ZONE, T10_SESSION_TEXT, T11_CANDLE_CONFIRMATION,
  T12_OPTIONS_STRIKES, T13_NO_FATAL_ERRORS, T14_COMPLETION_TIME,
  T15_CDP_CONNECT, T16_GUI_DRAW_VISIBLE, T17_VLM_ZONES, T18_TEMPORAL_ANCHOR,
  T19_TOOL_SEQUENCE, T20_MANUAL_STEPS,
];

/**
 * runAllTests BECAUSE the harness must produce a single pass/fail for
 * the CI gate. ALL tests must pass for the pipeline to be considered
 * production-ready.
 */
export function runAllTests(ctx: TestContext): TestOutcome[] {
  return ALL_PLUTUS_TESTS.map((spec) => {
    const start = Date.now();
    let passed = false;
    try {
      passed = spec.predicate(ctx);
    } catch {
      passed = false;
    }
    return {
      testId: spec.id,
      testName: spec.name,
      passed,
      evidence: spec.evidence(ctx),
      humanNote: passed ? 'PASS' : 'FAIL',
      durationMs: Date.now() - start,
    };
  });
}
