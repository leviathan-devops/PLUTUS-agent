// Plutus V5 W2 — src/e1/tests/helpers.ts
// Shared test scaffolding for the E1 battery (spec B.W2.6 + test matrix W2 rows).
// Doctrine anchors: B.W2.5 (MarketDataAdapter temporal gate), B.W2.1 (the 7
// classifications + 6 pressure states), B.W2.6 (the 6 properties).
//
// SEAM (recorded for the orchestrator): src/e1/adapters/* + src/e1/actors/* are
// owned by sibling w2-e1-actors-adapters and were ABSENT at build start. The
// MarketDataAdapterDouble + ObcvDouble below implement the CONTRACTED surfaces
// (temporal gate b.t <= anchorMs; FUTURE_BAR_LEAK typed error; OBCV bw>=3.0 /
// bf>=0.65 gates) and MUST be replaced by the sibling's landings. Every test
// that uses a double cites SEAM-ADAPTER / SEAM-OBCV in its case description.

import type { LexiconData, OHLCBar, PairKey, Rung, TimeframeKey, ZoneModel } from '../core/types';

// ── the doctrine tables (spec B.W2.1 lines 681-686 + B.W2.3 machine-3 families) ──
// types.ts carries 6 ZoneClassification values; the 7th valid value is FORTRESS
// (the fortressBom family, B.W2.3). PressureState is the 6 lifecycle states.
export const VALID_CLASSIFICATIONS: ReadonlyArray<string> = [
  'BoM', 'MoM', 'IP', 'LSZ', 'PHANTOM_BOM', 'REJECT', 'FORTRESS',
];
export const VALID_PRESSURE_STATES: ReadonlyArray<string> = [
  'VIRGIN', 'ACTIVE-1', 'ACTIVE-2', 'DEPLETED', 'FORTRESS', 'BROKEN',
];
export const VALID_INTENTS: ReadonlyArray<string> = ['flagged', 'none'];
export const VALID_ACTIONS: ReadonlyArray<string> = [
  'allow', 'block', 'warn', 'chain', 'classify', 'reject', 'escalate',
];

// ── the seeded PRNG (deterministic bars — NO wall-clock, seed recorded) ──
export const SYNTH_SEED = 20260706;
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── SEAM-ADAPTER: the MarketDataAdapter contract double ──
// Contract (B.W2.5): INPUT raw bars → OUTPUT OHLCBar[]; GATE bars b.t <=
// anchorMs; ERROR post-anchor bar → FUTURE_BAR_LEAK (typed Schema error).
export class FutureBarLeakError extends Error {
  readonly code = 'FUTURE_BAR_LEAK';
  readonly barT: number;
  readonly anchorMs: number;
  constructor(barT: number, anchorMs: number) {
    super(`[FUTURE_BAR_LEAK] bar t=${barT} past anchorMs=${anchorMs} — the temporal gate refused the future bar`);
    this.name = 'FutureBarLeakError';
    this.barT = barT;
    this.anchorMs = anchorMs;
  }
}

export function adaptBarsOrThrow(raw: OHLCBar[], anchorMs: number): OHLCBar[] {
  if (!Array.isArray(raw)) throw new Error('[ADAPTER] raw bars must be an array');
  if (!Number.isFinite(anchorMs)) throw new Error('[ADAPTER] anchorMs must be finite');
  for (const b of raw) {
    if (b === null || b === undefined) throw new Error('[ADAPTER] null bar refused');
    if (!Number.isFinite(b.t) || !Number.isFinite(b.O) || !Number.isFinite(b.H) ||
        !Number.isFinite(b.L) || !Number.isFinite(b.C)) {
      throw new Error(`[ADAPTER] malformed bar refused: ${JSON.stringify(b)}`);
    }
    if (b.H < b.L) throw new Error(`[ADAPTER] inverted range refused: H=${b.H} L=${b.L}`);
    if (b.t > anchorMs) throw new FutureBarLeakError(b.t, anchorMs);
  }
  return raw.slice().sort((a, b) => a.t - b.t);
}

// ── SEAM-OBCV: the OBCVEngine contract double ──
// Contract (B.W2.5): INPUT OHLCBar[] → OUTPUT ZoneModel[] with bw>=3.0 /
// bf>=0.65 gates. Detection: pivot low followed by a displacing up-close;
// pivot high followed by a displacing down-close. Values computed from data.
export function detectZonesObcv(
  bars: OHLCBar[],
  opts: { pair: PairKey; tf: TimeframeKey; pip: number; anchorMs: number },
): ZoneModel[] {
  if (bars.length < 3) return [];
  const zones: ZoneModel[] = [];
  for (let i = 1; i < bars.length - 1; i++) {
    const prev = bars[i - 1]!;
    const cur = bars[i]!;
    const next = bars[i + 1]!;
    const range = cur.H - cur.L;
    if (!(range > 0)) continue;
    const body = Math.abs(cur.C - cur.O);
    const bf = body / range;
    const bw = range / opts.pip;
    if (bw < 3.0 || bf < 0.65) continue;
    const bullish = cur.C > cur.O;
    const bearish = cur.C < cur.O;
    const pivotLow = cur.L < prev.L && cur.L < next.L;
    const pivotHigh = cur.H > prev.H && cur.H > next.H;
    if (bullish && pivotLow) {
      zones.push({
        id: `${opts.pair}|${opts.tf}|${cur.t}|${cur.L.toFixed(5)}`,
        type: 'DEMAND', top: cur.H, bottom: cur.L, classification: 'BoM',
        formationMs: cur.t, originIdx: i, bw, bf, prior: 'NONE', tf: opts.tf, zfp: 0.5,
      });
    } else if (bearish && pivotHigh) {
      zones.push({
        id: `${opts.pair}|${opts.tf}|${cur.t}|${cur.H.toFixed(5)}`,
        type: 'SUPPLY', top: cur.H, bottom: cur.L, classification: 'BoM',
        formationMs: cur.t, originIdx: i, bw, bf, prior: 'NONE', tf: opts.tf, zfp: 0.5,
      });
    }
  }
  return zones;
}

// ── deterministic synthetic bars (the bars_raw.json substitution) ──
// Substitution recorded honestly: no bars_raw.json exists in the project or
// /tmp/opencode at build time, so run-fixture + property runs generate bars
// from mulberry32(SYNTH_SEED) shaped to exercise the golden zones. Seed in
// every snapshot artifact.
export function synthBars(
  seed: number,
  n: number,
  startT: number,
  stepMs: number,
  startPrice: number,
  drift: number,
  vol: number,
): OHLCBar[] {
  const rnd = mulberry32(seed);
  const bars: OHLCBar[] = [];
  let p = startPrice;
  for (let i = 0; i < n; i++) {
    const o = p;
    const c = p + drift + (rnd() - 0.5) * 2 * vol;
    const h = Math.max(o, c) + rnd() * vol;
    const l = Math.min(o, c) - rnd() * vol;
    bars.push({ t: startT + i * stepMs, O: o, H: h, L: l, C: c });
    p = c;
  }
  return bars;
}

export function makeZone(partial: Partial<ZoneModel> & { id: string }): ZoneModel {
  return {
    type: 'DEMAND', top: 1.141, bottom: 1.14, classification: 'BoM',
    formationMs: 1000, originIdx: 0, bw: 3.5, bf: 0.7, prior: 'NONE',
    tf: '1H', zfp: 0.5, ...partial,
  };
}

export function makeRung(id: string, zoneId: string, floor: number, ceiling: number): Rung {
  return { id, zoneId, floor, ceiling, type: 'DEMAND' };
}

export function baseMeta(over: Partial<LexiconData['meta']> = {}): LexiconData['meta'] {
  return {
    pair: 'EUR/USD', week: '2026-07-06', anchorMs: 1783317600000,
    atr14: 0.0006, pip: 0.0001, spot: 1.142, ...over,
  };
}

export function makeLexiconData(p: Partial<Omit<LexiconData, 'meta'>> & { meta?: Partial<LexiconData['meta']> } = {}): LexiconData {
  const { meta, ...rest } = p;
  return {
    bars: [], zones: [], rungs: [], shapeChain: [],
    lqzMatrix: { table: [] }, e1: {}, e2: {},
    ...rest,
    meta: baseMeta(meta),
  };
}
