import { describe, expect, test } from 'bun:test';
import {
  COND_PAGE_BREAK_PT, REPORT_SECTIONS, SECTION_COUNT,
  SectionOrderError, UnknownSectionError,
  requiredFieldsFor, sectionById, sectionIds, validateSectionOrder,
} from './report-model';

describe('report-model: the 25-section spine', () => {
  test('exactly 25 sections on disk', () => {
    expect(REPORT_SECTIONS.length).toBe(SECTION_COUNT);
    expect(SECTION_COUNT).toBe(25);
  });
  test('ids contiguous 1..25 in order', () => {
    expect(sectionIds()).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(() => validateSectionOrder(sectionIds())).not.toThrow();
  });
  test('every section keeps together with its heading', () => {
    for (const s of REPORT_SECTIONS) expect(s.keepTogether).toBe(true);
  });
  test('hard page breaks only before pair sections 9/14/19', () => {
    const breaks = REPORT_SECTIONS.filter((s) => s.pageBreakBefore).map((s) => s.id);
    expect(breaks).toEqual([9, 14, 19]);
  });
  test('cond break is 140 everywhere except section 1', () => {
    for (const s of REPORT_SECTIONS) {
      expect(s.condPageBreakPt).toBe(s.id === 1 ? null : COND_PAGE_BREAK_PT);
    }
  });
});

describe('report-model: adversarial', () => {
  test('unknown section id throws typed UnknownSectionError', () => {
    let err: unknown = null;
    try { sectionById(26); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(UnknownSectionError);
    expect((err as UnknownSectionError).code).toBe('UNKNOWN_SECTION');
  });
  test('section 0 throws (lower boundary)', () => {
    expect(() => sectionById(0)).toThrow(UnknownSectionError);
  });
  test('swapped order refused loudly', () => {
    const bad = sectionIds();
    [bad[0], bad[1]] = [bad[1]!, bad[0]!];
    expect(() => validateSectionOrder(bad)).toThrow(SectionOrderError);
  });
  test('empty list refused (never a silent empty document)', () => {
    expect(() => validateSectionOrder([])).toThrow(SectionOrderError);
  });
  test('required fields present on every section', () => {
    for (const s of REPORT_SECTIONS) expect(requiredFieldsFor(s.id).length).toBeGreaterThan(0);
  });
  test('section 25 is the cross-pair matrix with matrix fields', () => {
    expect(sectionById(25).title).toContain('Cross-Pair Comparison Matrix');
    expect(requiredFieldsFor(25)).toContain('matrix');
  });
});
