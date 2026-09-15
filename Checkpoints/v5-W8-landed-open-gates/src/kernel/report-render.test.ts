import { describe, expect, test } from 'bun:test';
import {
  RRR_FLOOR, ReportRenderError, render, renderToJson,
  type ReportProjectionInput, type ReportTradeProjection,
} from './report-render';

function proj(over: Partial<ReportTradeProjection> = {}): ReportTradeProjection {
  return {
    pair: 'EUR/USD', direction: 'LONG', entry: 1.1411, sl: 1.1401, tp: 1.1451,
    rrr: 4, confidence: 0.8,
    anchors: [{ price: 1.1411, e1ZoneId: 'EUR/USD|1H|1782990000000|1.14004', e2ProjectionId: 'tue-eu-short', method: 'mirror-lmv' }],
    e1ZoneId: 'EUR/USD|1H|1782990000000|1.14004',
    e2DesignationId: 'tue-eu-short',
    day: 'Tuesday', session: 'London Open 02:00-05:00 ET', setupId: 'EU-TUE-L1',
    ...over,
  };
}

function input(over: Partial<ReportProjectionInput> = {}): ReportProjectionInput {
  return {
    meta: {
      week: '2026-07-06', analysisPointMs: 1783317600000,
      pairs: ['DXY', 'EUR/USD', 'GBP/USD'], generated: 'ses-test',
      spots: { DXY: 99.24, 'EUR/USD': 1.1411 },
    },
    projections: [proj()],
    ...over,
  };
}

describe('report-render: happy path', () => {
  test('valid projection renders 25 ordered sections, zero failures', () => {
    const out = render(input());
    expect(out.sections.length).toBe(25);
    expect(out.sectionOrder).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(out.ruleFailures).toEqual([]);
    expect(out.tradeValid).toBe(true);
  });
  test('determinism: same input → byte-identical JSON', () => {
    expect(renderToJson(input())).toBe(renderToJson(input()));
  });
  test('projection rows land in their pair band (EU rows in §9)', () => {
    const out = render(input());
    const s9 = out.sections.find((s) => s.id === 9)!;
    expect(s9.rows.some((r) => r.includes('EU-TUE-L1'))).toBe(true);
  });
});

describe('report-render: adversarial (loud FAIL, never stub)', () => {
  test('null projection throws MISSING_PROJECTION', () => {
    let err: unknown = null;
    try { render(null); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(ReportRenderError);
    expect((err as ReportRenderError).code).toBe('MISSING_PROJECTION');
  });
  test('undefined projection throws MISSING_PROJECTION', () => {
    expect(() => render(undefined)).toThrow(ReportRenderError);
  });
  test('empty projections array throws (no stub report)', () => {
    try { render(input({ projections: [] })); expect.unreachable(); }
    catch (e) { expect((e as ReportRenderError).code).toBe('MISSING_PROJECTION'); }
  });
  test('projection missing provenance ids throws INVALID_PROJECTION', () => {
    try { render(input({ projections: [proj({ e1ZoneId: '' })] })); expect.unreachable(); }
    catch (e) { expect((e as ReportRenderError).code).toBe('INVALID_PROJECTION'); }
  });
  test('anchor without e2ProjectionId throws INVALID_PROJECTION', () => {
    const bad = proj({ anchors: [{ price: 1.1411, e1ZoneId: 'z', e2ProjectionId: '', method: 'm' }] });
    try { render(input({ projections: [bad] })); expect.unreachable(); }
    catch (e) { expect((e as ReportRenderError).code).toBe('INVALID_PROJECTION'); }
  });
  test('inverted LONG (sl>entry) is marked up, tradeValid=false, no throw', () => {
    const out = render(input({ projections: [proj({ sl: 1.142, tp: 1.1451, rrr: 3.1 })] }));
    expect(out.tradeValid).toBe(false);
    expect(out.sections.flatMap((s) => s.ruleMarks).some((m) => m.includes('DIRECTION_ORDER'))).toBe(true);
  });
  test('sub-floor RRR is marked up (floor refuses silently-passing junk)', () => {
    const out = render(input({ projections: [proj({ tp: 1.1416, rrr: 0.5 })] }));
    expect(out.tradeValid).toBe(false);
    expect(out.sections.flatMap((s) => s.ruleMarks).some((m) => m.includes(`below RRR floor ${RRR_FLOOR}`))).toBe(true);
  });
  test('confidence out of range is marked up', () => {
    const out = render(input({ projections: [proj({ confidence: 1.5 })] }));
    expect(out.tradeValid).toBe(false);
  });
  test('NaN entry throws (never computed into the document)', () => {
    try { render(input({ projections: [proj({ entry: NaN })] })); expect.unreachable(); }
    catch (e) { expect((e as ReportRenderError).code).toBe('INVALID_PROJECTION'); }
  });
  test('meta without analysisPointMs throws INVALID_META (no wall-clock fallback)', () => {
    const bad = input();
    (bad.meta as { analysisPointMs: unknown }).analysisPointMs = undefined;
    try { render(bad); expect.unreachable(); }
    catch (e) { expect((e as ReportRenderError).code).toBe('INVALID_META'); }
  });
});
