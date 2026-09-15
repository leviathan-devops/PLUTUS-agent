import { describe, expect, test } from 'bun:test';
import {
  REPORT_RULES, countRuleViolations, evaluateRules, ruleById,
  type RuleContext,
} from './report-rules';
import { sectionIds } from './report-model';

function cleanCtx(): RuleContext {
  return {
    sectionIds: sectionIds(),
    pageSize: 'letter',
    marginsIn: 0.5,
    condPageBreakPt: 140,
    cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    centerAligned: true,
    valignMiddle: true,
    keepTogetherSections: sectionIds(),
    pageBreakBeforePairs: true,
    maxTableWidthIn: 6.55,
    pairBreakSections: [9, 14, 19],
  };
}

describe('report-rules: the 52-row table', () => {
  test('exactly 52 rule rows', () => {
    expect(REPORT_RULES.length).toBe(52);
  });
  test('ids contiguous 1..52, unique', () => {
    expect(REPORT_RULES.map((r) => r.id)).toEqual(Array.from({ length: 52 }, (_, i) => i + 1));
    expect(new Set(REPORT_RULES.map((r) => r.id)).size).toBe(52);
  });
  test('all six bands represented', () => {
    const bands = new Set(REPORT_RULES.map((r) => r.band));
    expect(bands).toEqual(new Set(['notation', 'table', 'layout', 'style', 'whitespace', 'bulletproof']));
  });
  test('every rule carries severity + section mapping + predicate', () => {
    for (const r of REPORT_RULES) {
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(r.severity);
      expect(r.sections.length).toBeGreaterThan(0);
      expect(typeof r.check).toBe('function');
      expect(r.statement.length).toBeGreaterThan(20);
    }
  });
  test('clean context passes all 52', () => {
    const evals = evaluateRules(cleanCtx());
    expect(evals.filter((e) => !e.passed)).toEqual([]);
    expect(countRuleViolations(cleanCtx())).toBe(0);
  });
});

describe('report-rules: adversarial (predicates actually fire)', () => {
  test('broken margins fire rules 20+36, nothing else invented', () => {
    const n = countRuleViolations({ ...cleanCtx(), marginsIn: 1 });
    expect(n).toBe(2);
    expect(ruleById(20).check({ ...cleanCtx(), marginsIn: 1 }).length).toBe(1);
  });
  test('wrong cond-break value fires rules 33+44', () => {
    const evals = evaluateRules({ ...cleanCtx(), condPageBreakPt: 100 });
    const failed = evals.filter((e) => !e.passed).map((e) => e.ruleId);
    expect(failed).toEqual([33, 44]);
  });
  test('missing KeepTogether fires 34+39+45', () => {
    const evals = evaluateRules({ ...cleanCtx(), keepTogetherSections: [] });
    const failed = evals.filter((e) => !e.passed).map((e) => e.ruleId);
    expect(failed).toContain(34);
    expect(failed).toContain(39);
    expect(failed).toContain(45);
  });
  test('stray PageBreak outside pair sections fires rule 32', () => {
    const evals = evaluateRules({ ...cleanCtx(), pairBreakSections: [9, 14, 19, 5] });
    expect(evals.find((e) => e.ruleId === 32)!.passed).toBe(false);
  });
  test('a throwing predicate is a violation, never a crash', () => {
    const throwing = { ...cleanCtx() };
    (throwing as { sectionIds: unknown }).sectionIds = null;
    expect(() => evaluateRules(throwing)).not.toThrow();
    expect(countRuleViolations(throwing)).toBeGreaterThan(0);
  });
  test('unknown rule id refused loudly', () => {
    expect(() => ruleById(53)).toThrow('[REPORT-RULES] unknown rule id refused: 53');
  });
});
