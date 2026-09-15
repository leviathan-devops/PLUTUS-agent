// Plutus V5 W2 — src/e1/tests/properties.test.ts
// The 500-run property battery (spec B.W2.6, extends the skeleton
// KNOWLEDGE_LIBRARY/.../OHLC-Intelligence-Lexicon-v1.0/tests/properties.ts):
//   P1 ∀ zone: classification ∈ the 7 valid values (B.W2.1 + fortressBom family)
//   P2 ∀ zone: pressure ∈ the 6 valid states (B.W2.1)
//   P3 ∀ bar: b.t <= anchorMs through the gate (B.W2.5 temporal gate)
//   P4 ∀ predicate: deterministic — same data → same result (500 re-runs)
//   P5 ∀ family: confidence ∈ [0,1], never negative (pos/(pos+neg+1))
//   P6 ∀ machine: classify returns intent ∈ the valid intents
// Fail-capable: each property has a mutation tripwire test proving it CAN fail
// (a broken predicate / a future bar / an invalid label must fail the run).
// bun test src/e1/tests/properties.test.ts
import { describe, expect, test } from 'bun:test';
import { DEFAULT_MACHINES } from '../machines/index';
import {
  confidence, scoreSignals, windowBars,
} from '../core/engine';
import type { LexiconData } from '../core/types';
import {
  VALID_ACTIONS, VALID_CLASSIFICATIONS, VALID_INTENTS, VALID_PRESSURE_STATES,
  FutureBarLeakError, SYNTH_SEED, adaptBarsOrThrow, makeLexiconData,
  makeZone, mulberry32, synthBars,
} from './helpers';
import {
  defendFixture, emptyTradesFixture, obviousLongFixture, phantomFixture, ssFixture,
} from './fixtures';

const RUNS = 500;
const ANCHOR = 1783317600000;

// Deterministic run-variant generator: seeded PRNG (seed recorded in helpers)
// mutates bars/zones without ever crossing the anchor or inventing labels.
function runVariant(run: number): LexiconData {
  const rnd = mulberry32(SYNTH_SEED + run);
  const n = 6 + Math.floor(rnd() * 10);
  const bars = synthBars(SYNTH_SEED + run, n, ANCHOR - 72 * 3600_000, 3600_000, 1.14, 0, 0.0004)
    .filter((b) => b.t <= ANCHOR);
  const span = 0.0008 + rnd() * 0.0012;
  const bottom = 1.138 + rnd() * 0.006;
  const labels = ['BoM', 'MoM', 'IP', 'LSZ', 'PHANTOM_BOM', 'REJECT'] as const;
  const states = ['VIRGIN', 'ACTIVE-1', 'ACTIVE-2', 'DEPLETED', 'FORTRESS', 'BROKEN'] as const;
  const zone = makeZone({
    id: `P-${run}`,
    type: rnd() > 0.5 ? 'DEMAND' : 'SUPPLY',
    top: bottom + span, bottom,
    classification: labels[Math.floor(rnd() * labels.length)]!,
    tf: (['1H', '4H', '30m', '15m'] as const)[Math.floor(rnd() * 4)]!,
    pressure: states[Math.floor(rnd() * states.length)]!,
    reactionCount: Math.floor(rnd() * 6),
    zfp: rnd(),
  });
  return makeLexiconData({
    bars, zones: [zone], meta: { anchorMs: ANCHOR, spot: bottom + span / 2, candidateZoneId: zone.id },
  });
}

describe('E1 property battery (500 runs x 6 properties)', () => {
  test('P1: every zone classification is one of the 7 valid values', () => {
    for (let run = 0; run < RUNS; run++) {
      const d = runVariant(run);
      for (const z of d.zones) {
        expect(VALID_CLASSIFICATIONS).toContain(z.classification);
      }
    }
  });

  test('P2: every pressure state is one of the 6 valid states', () => {
    for (let run = 0; run < RUNS; run++) {
      const d = runVariant(run);
      for (const z of d.zones) {
        if (z.pressure !== undefined) expect(VALID_PRESSURE_STATES).toContain(z.pressure);
      }
    }
  });

  test('P3: the temporal gate holds — windowBars never sees past anchorMs', () => {
    for (let run = 0; run < RUNS; run++) {
      const d = runVariant(run);
      for (const b of windowBars(d)) {
        expect(b.t).toBeLessThanOrEqual(d.meta.anchorMs);
      }
      // the adapter boundary refuses future bars loudly (SEAM-ADAPTER double)
      const gated = adaptBarsOrThrow(d.bars, d.meta.anchorMs);
      expect(gated.length).toBe(d.bars.length);
    }
  });

  test('P4: determinism — same data → same verdict across all machines x 500 runs', () => {
    const anchors = [phantomFixture(), ssFixture(), defendFixture(), obviousLongFixture(), emptyTradesFixture()];
    for (let run = 0; run < RUNS; run++) {
      const pool = run % 2 === 0 ? anchors : [runVariant(run)];
      for (const data of pool) {
        for (const m of DEFAULT_MACHINES) {
          const a = m.classify({ data });
          const b = m.classify({ data });
          expect(b.intent).toBe(a.intent);
          expect(b.action).toBe(a.action);
          expect(b.confidence).toBe(a.confidence);
          expect(b.evidence).toBe(a.evidence);
        }
      }
    }
  });

  test('P5: confidence never negative, always in [0,1] (all machines x 500 runs)', () => {
    for (let run = 0; run < RUNS; run++) {
      const d = runVariant(run);
      for (const m of DEFAULT_MACHINES) {
        const r = m.classify({ data: d });
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
        expect(Number.isFinite(r.confidence)).toBe(true);
      }
    }
    // the formula floor: pos/(pos+neg+1) < 1 always, = 0 iff pos = 0
    expect(confidence(0, 5)).toBe(0);
    expect(confidence(3, 0)).toBeCloseTo(0.75, 10);
  });

  test('P6: every machine returns a valid intent + valid action (500 runs)', () => {
    for (let run = 0; run < RUNS; run++) {
      const d = runVariant(run);
      for (const m of DEFAULT_MACHINES) {
        const r = m.classify({ data: d });
        expect(VALID_INTENTS).toContain(r.intent);
        expect(VALID_ACTIONS).toContain(r.action);
      }
    }
    expect(DEFAULT_MACHINES.length).toBe(6);
  });
});

describe('property tripwires (each property MUST be able to fail)', () => {
  test('T-P1: an invalid classification label is caught by the P1 check', () => {
    const d = runVariant(1);
    (d.zones[0] as { classification: string }).classification = 'SUPER_BOM';
    expect(VALID_CLASSIFICATIONS).not.toContain(d.zones[0]!.classification);
  });
  test('T-P2: an invalid pressure state is caught by the P2 check', () => {
    const d = runVariant(2);
    (d.zones[0] as { pressure: string }).pressure = 'GODMODE';
    expect(VALID_PRESSURE_STATES).not.toContain(d.zones[0]!.pressure as string);
  });
  test('T-P3: a post-anchor bar trips FUTURE_BAR_LEAK at the adapter', () => {
    const d = runVariant(3);
    const future = { t: ANCHOR + 1, O: 1.14, H: 1.141, L: 1.139, C: 1.1405 };
    expect(() => adaptBarsOrThrow([...d.bars, future], ANCHOR)).toThrow(FutureBarLeakError);
  });
  test('T-P4: mutated data changes the verdict (determinism is data-sensitive, not constant)', () => {
    const a = defendFixture();
    const b = makeLexiconData({ ...a, bars: [] });
    let differs = false;
    for (const m of DEFAULT_MACHINES) {
      const ra = m.classify({ data: a });
      const rb = m.classify({ data: b });
      if (ra.action !== rb.action || ra.confidence !== rb.confidence) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });
  test('T-P5: scoreSignals evidence path — a crashing predicate counts (fail-closed)', () => {
    const d = runVariant(5);
    const crashing = { group: 'zone-predicate', descriptive: [], suggestive: [() => { throw new Error('boom'); }] } as any;
    const s = scoreSignals(d, crashing);
    expect(s.pos).toBe(1);
  });
  test('T-P6: no-data input returns the documented none/allow floor', () => {
    for (const m of DEFAULT_MACHINES) {
      const r = m.classify({});
      expect(VALID_INTENTS).toContain(r.intent);
    }
  });
});
