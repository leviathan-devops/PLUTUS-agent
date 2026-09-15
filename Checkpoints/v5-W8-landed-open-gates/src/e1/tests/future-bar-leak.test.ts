// Plutus V5 W2 — src/e1/tests/future-bar-leak.test.ts
// The temporal-gate mutants (spec B.W2.5 + SC-5): the MarketDataAdapter gate
// bars.filter(b => b.t <= anchorMs); a bar past anchorMs → FUTURE_BAR_LEAK
// (typed Schema error). Uses the SEAM-ADAPTER contract double (helpers.ts) —
// replace with the sibling's src/e1/adapters/MarketDataAdapter on landing.
// bun test src/e1/tests/future-bar-leak.test.ts
import { describe, expect, test } from 'bun:test';
import { FutureBarLeakError, adaptBarsOrThrow } from './helpers';

const ANCHOR = 1783317600000; // spec D.4 ANALYSIS_POINT_MS
const bar = (t: number) => ({ t, O: 1.14, H: 1.141, L: 1.139, C: 1.1405 });

describe('FUTURE_BAR_LEAK temporal gate (3 mutants)', () => {
  test('M1 FIRES: a single post-anchor bar throws FUTURE_BAR_LEAK', () => {
    const bars = [bar(ANCHOR - 3600_000), bar(ANCHOR - 1000), bar(ANCHOR + 3_600_000)];
    let err: unknown = null;
    try { adaptBarsOrThrow(bars, ANCHOR); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(FutureBarLeakError);
    expect((err as FutureBarLeakError).code).toBe('FUTURE_BAR_LEAK');
    expect((err as FutureBarLeakError).barT).toBe(ANCHOR + 3_600_000);
    expect((err as Error).message).toContain('FUTURE_BAR_LEAK');
  });
  test('M2 PASSES: an exactly-at-anchor bar passes (boundary <=, not <)', () => {
    const bars = [bar(ANCHOR - 3600_000), bar(ANCHOR)];
    const out = adaptBarsOrThrow(bars, ANCHOR);
    expect(out.length).toBe(2);
  });
  test('M3 FIRES: a bar 1ms past the anchor throws (no epsilon tolerance)', () => {
    const bars = [bar(ANCHOR - 1000), bar(ANCHOR + 1)];
    expect(() => adaptBarsOrThrow(bars, ANCHOR)).toThrow(FutureBarLeakError);
  });
});

describe('adapter error paths FIRST (the honesty requirements)', () => {
  test('null bar refused loudly (never silently dropped)', () => {
    expect(() => adaptBarsOrThrow([bar(ANCHOR - 1), null as any], ANCHOR)).toThrow('[ADAPTER] null bar refused');
  });
  test('malformed bar (NaN) refused loudly', () => {
    expect(() => adaptBarsOrThrow([{ t: ANCHOR - 1, O: NaN, H: 1.141, L: 1.139, C: 1.1405 }], ANCHOR)).toThrow('[ADAPTER] malformed bar refused');
  });
  test('inverted range (H<L) refused loudly', () => {
    expect(() => adaptBarsOrThrow([{ t: ANCHOR - 1, O: 1.14, H: 1.138, L: 1.139, C: 1.1405 }], ANCHOR)).toThrow('[ADAPTER] inverted range refused');
  });
  test('non-finite anchor refused loudly', () => {
    expect(() => adaptBarsOrThrow([bar(1)], NaN)).toThrow('[ADAPTER] anchorMs must be finite');
  });
  test('empty input returns empty (honest absence, not an error)', () => {
    expect(adaptBarsOrThrow([], ANCHOR)).toEqual([]);
  });
});
