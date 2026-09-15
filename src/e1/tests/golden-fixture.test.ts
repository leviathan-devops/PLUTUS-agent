// Plutus V5 W2 — src/e1/tests/golden-fixture.test.ts
// The golden-week zone classifications (spec B.W2.6 GOLDEN-WEEK FIXTURES +
// matrix W2 row: 15 trades + D100). Loads specs/fixtures/golden-week.json
// (the W0 fixture — oracle rows + Monday set) and constructs the entry-zone
// evidence per trade. Doctrine: Golden_Operator_Trade_Feedback_EU_GU.md
// (the row geometry) + B.W2.3-M6 (RRR>=2.5 gate) + D13 (oracle rows are
// MEASUREMENT targets — expected values derive from the rows, levels are
// never read for computation).
// bun test src/e1/tests/golden-fixture.test.ts
import { describe, expect, test } from 'bun:test';
import golden from '../../../specs/fixtures/golden-week.json';
import { zoneClassificationMachine } from '../machines/index';
import { largeOb } from '../core/engine';
import type { LexiconData, ZoneModel } from '../core/types';
import { VALID_ACTIONS, VALID_INTENTS, makeLexiconData, synthBars } from './helpers';

const ANCHOR: number = (golden.meta as { analysisPointMs: number }).analysisPointMs;
const PIP = 0.0001;
const ATR = 0.0006;

interface OracleRow { n: number; day: string; dir: string; shape: string; e: number; sl: number; tp: number; rrr: number; }

function rowsOf(pair: 'eurusd' | 'gbpusd'): OracleRow[] {
  return ((golden.oracle as any)[pair].rows as OracleRow[]);
}
const ALL_ROWS: Array<OracleRow & { pair: string }> = [
  ...rowsOf('eurusd').map((r) => ({ ...r, pair: 'EUR/USD' })),
  ...rowsOf('gbpusd').map((r) => ({ ...r, pair: 'GBP/USD' })),
];

// The entry-zone evidence, computed FROM the row (hardcode ban: geometry is
// derived — SHORT entry sits at the supply close edge, SL beyond the far
// edge; LONG mirrored). Entry-inside + SL-outside + TP-outside are the
// structural checks the DesignationMachine guards will consume in W3.
function zoneForRow(row: OracleRow, idx: number): ZoneModel {
  const short = row.dir === 'Short';
  return {
    id: `GOLD-${idx}`,
    type: short ? 'SUPPLY' : 'DEMAND',
    top: short ? row.sl : row.e,
    bottom: short ? row.e : row.sl,
    classification: 'BoM',
    formationMs: ANCHOR - 3 * 86400_000,
    originIdx: 0, bw: 3.5, bf: 0.7, prior: 'NONE', tf: '1H', zfp: 0.5,
    pressure: 'VIRGIN', reactionCount: 0,
  };
}

// DIVERGENT ROWS (locked, not fitted): the W0 fixture's sl field on these rows
// does not reduce to the oracle rrr via naive |tp-e|/|sl-e| arithmetic.
// EU#8: doc lines 55-56 place the true SL ~1.14640 (2 pips inside the
// 1.14660-1.14620 LQZ) → 39p/8.5p = 4.59; the fixture sl=1.14540 would give
// 26R and sits on the WRONG side for a SHORT. GU#1: naive 63.5p/8p = 7.94 vs
// oracle 8.94 (Δ≈1.0 — execution-SL nuance). W5 golden-coverage resolves;
// W2 locks both sides so any silent fixture edit FAILS.
const DIVERGENT: Record<string, string> = {
  'EUR/USD#8': 'fixture sl=1.14540 inverts the SHORT orientation (doc: true SL ~1.14640); naive RRR 26 vs oracle 4.59',
  'GBP/USD#1': 'naive RRR 7.94 vs oracle 8.94 (Δ≈1.0 execution-SL nuance)',
};
const divKey = (row: OracleRow & { pair: string }): string => `${row.pair}#${row.n}`;

function dataForRow(row: OracleRow & { pair: string }, idx: number): LexiconData {
  const zone = zoneForRow(row, idx);
  const bars = synthBars(9000 + idx, 8, ANCHOR - 8 * 3600_000, 3600_000, row.e, 0, 0.0003)
    .filter((b) => b.t <= ANCHOR);
  return makeLexiconData({
    bars, zones: [zone],
    meta: { pair: row.pair as LexiconData['meta']['pair'], anchorMs: ANCHOR, spot: row.e, candidateZoneId: zone.id, atr14: ATR, pip: PIP },
  });
}

describe('golden-week zone evidence (15 oracle rows)', () => {
  test('oracle shape: 8 EU + 7 GU rows + Monday 5-set', () => {
    expect(rowsOf('eurusd').length).toBe(8);
    expect(rowsOf('gbpusd').length).toBe(7);
    expect(ALL_ROWS.length).toBe(15);
    expect(((golden as any).mondayConvergence.set as unknown[]).length).toBe(5);
  });

  for (let i = 0; i < ALL_ROWS.length; i++) {
    const row = ALL_ROWS[i]!;
    const label = `${row.pair} #${row.n} ${row.day} ${row.dir} ${row.shape} E=${row.e}`;
    test(`${label}: zone type matches direction (E2 orientation law, B.W3.2)`, () => {
      const z = zoneForRow(row, i);
      expect(z.type).toBe(row.dir === 'Short' ? 'SUPPLY' : 'DEMAND');
    });
    test(`${label}: entry inside zone, SL outside far side, TP outside target side`, () => {
      const z = zoneForRow(row, i);
      if (DIVERGENT[divKey(row)] !== undefined) {
        // locked divergence (see DIVERGENT): the row's sl breaks the
        // orientation law — assert the break explicitly, never skip it
        if (divKey(row) === 'EUR/USD#8') {
          expect(row.sl).toBeLessThan(row.e);
          expect(z.top).toBeLessThan(z.bottom);
        }
        return;
      }
      expect(row.e).toBeGreaterThanOrEqual(z.bottom);
      expect(row.e).toBeLessThanOrEqual(z.top);
      if (row.dir === 'Short') {
        expect(row.sl).toBeGreaterThanOrEqual(z.top);
        expect(row.tp).toBeLessThan(z.bottom);
      } else {
        expect(row.sl).toBeLessThanOrEqual(z.bottom);
        expect(row.tp).toBeGreaterThan(z.top);
      }
    });
    test(`${label}: RRR recomputed from E/SL/TP matches the oracle row (<=0.06) + floor 2.5`, () => {
      const rrr = Math.abs(row.tp - row.e) / Math.abs(row.sl - row.e);
      if (DIVERGENT[divKey(row)] !== undefined) {
        // locked divergence: naive arithmetic does NOT reproduce the oracle
        // rrr — pin both values so a silent fixture edit FAILS
        if (divKey(row) === 'EUR/USD#8') {
          expect(row.rrr).toBe(4.59);
          expect(rrr).toBeGreaterThan(20);
        } else {
          expect(row.rrr).toBe(8.94);
          expect(Math.abs(rrr - 7.94)).toBeLessThan(0.06);
        }
        return;
      }
      expect(Math.abs(rrr - row.rrr)).toBeLessThan(0.06);
      expect(rrr).toBeGreaterThanOrEqual(2.5);
    });
    test(`${label}: zone-classification machine runs loud + valid (no throw, valid intent)`, () => {
      const d = dataForRow(row, i);
      const r = zoneClassificationMachine.classify({ data: d });
      expect(VALID_INTENTS).toContain(r.intent);
      expect(VALID_ACTIONS).toContain(r.action);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });
  }
});

describe('golden spot checks (the mission rows)', () => {
  test('EU#2 near-edge rung [1.14100, 1.14120] contains the entry 1.14110 (width 2.0p computed)', () => {
    const eu2 = rowsOf('eurusd').find((r) => r.n === 2)!;
    expect(eu2.e).toBe(1.1411);
    const rung = { floor: 1.141, ceiling: 1.1412 };
    expect(eu2.e).toBeGreaterThanOrEqual(rung.floor);
    expect(eu2.e).toBeLessThanOrEqual(rung.ceiling);
    expect((rung.ceiling - rung.floor) / PIP).toBeCloseTo(2.0, 10);
  });
  test('EU#6 deep LQ shield [1.13935, 1.13875] holds the entry at its edge (width 6.0p computed)', () => {
    const eu6 = rowsOf('eurusd').find((r) => r.n === 6)!;
    expect(eu6.e).toBe(1.13935);
    const shield = { lo: 1.13875, hi: 1.13935 };
    expect(eu6.e).toBeLessThanOrEqual(shield.hi);
    expect(eu6.e).toBeGreaterThanOrEqual(shield.lo);
    expect((shield.hi - shield.lo) / PIP).toBeCloseTo(6.0, 10);
    expect(eu6.sl).toBeLessThan(shield.lo);
  });
  test('D100 Jun-22 origin: wide OB trips largeOb → the ALL-4 PHANTOM_BOM component (B.W2.3-M3)', () => {
    const jun22 = ANCHOR - 14 * 86400_000;
    const origin: ZoneModel = {
      id: 'D100-JUN22', type: 'DEMAND', top: 1.14145, bottom: 1.14,
      classification: 'MoM', formationMs: jun22, originIdx: 0,
      bw: 4.0, bf: 0.75, prior: 'SAME', parent: '4H-ORIGIN-1', tf: '1H',
      zfp: 0.62, pressure: 'VIRGIN', reactionCount: 0,
    };
    const d = makeLexiconData({
      bars: synthBars(2219622, 10, jun22 - 5 * 86400_000, 86400_000, 1.1407, 0.0002, 0.0004)
        .filter((b) => b.t <= ANCHOR),
      zones: [origin, {
        id: 'OB-SUPPLY', type: 'SUPPLY', top: 1.1423, bottom: 1.14185,
        classification: 'BoM', formationMs: jun22 - 86400_000, originIdx: 0,
        bw: 3.2, bf: 0.7, prior: 'OPPOSITE', tf: '1H', zfp: 0.55,
      }],
      meta: { anchorMs: ANCHOR, spot: 1.142, candidateZoneId: origin.id, atr14: ATR, pip: PIP },
    });
    expect(largeOb(d, origin)).toBe(true);
    const r = zoneClassificationMachine.classify({ data: d });
    expect(r.action).toBe('classify');
    expect(VALID_INTENTS).toContain(r.intent);
  });
  test('Monday 5/5 set levels are the oracle entries (spec D.2 convergence)', () => {
    const set = ((golden as any).mondayConvergence.set as Array<any>);
    const eu = set.filter((s) => s.pair === 'EUR/USD');
    const entries = eu.map((s) => s.entry ?? s.level);
    expect(entries).toContain(1.14395);
    expect(entries).toContain(1.1411);
    const gu = set.filter((s) => s.pair === 'GBP/USD');
    expect(gu.map((s) => s.entry ?? s.level)).toContain(1.3333);
  });
});
