// OHLC-Intelligence-Lexicon-v1.0 — tests/fixtures.ts
// The shared LexiconData fixtures for the property + per-machine tests.
// Every fixture is hand-computed so the machine predicates fire deterministically
// (the MPSE law — the same data → the same verdict). The phantom fixture models the
// operator's type-2 phantom BoM [1.14145-1.14000] from the EU LONG analysis.

import type { LexiconData, OHLCBar, ZoneModel } from '../core/types';

const BASE_META = {
  pair: 'EUR/USD' as const,
  week: '2026-07-06',
  anchorMs: 6000,
  atr14: 0.0006,
  pip: 0.0001,
  spot: 1.14200,
  tf: undefined as undefined,
  currentShape: undefined as undefined,
  candidateZoneId: undefined as undefined,
};

export function makeData(p: Omit<Partial<LexiconData>, 'meta'> & { meta?: Partial<LexiconData['meta']> }): LexiconData {
  const { meta, ...rest } = p;
  return {
    bars: [],
    zones: [],
    rungs: [],
    shapeChain: [],
    lqzMatrix: { table: [] },
    e1: {},
    e2: {},
    meta: { ...BASE_META, ...meta },
    ...rest,
  } as LexiconData;
}

// ── the PHANTOM-BoM fixture (the zone-classification classify case) ───────────
// The operator's type-2 virgin MoM [1.14145-1.14000]: the LARGE OB + the fakeout +
// the pre-formation opposing-BoM reaction + the macro-origin continuation (all-4).

export const PHANTOM_ZONE: ZoneModel = {
  id: 'PH-1',
  type: 'DEMAND',
  top: 1.14145,
  bottom: 1.14000,             // width 0.00145 = 14.5 pips >= 1.5 x atr14 (0.0009) — the LARGE OB
  classification: 'MoM',       // the MoM label (it IS a MoM — the phantom disguise)
  formationMs: 4000,
  originIdx: 3,
  bw: 4.0,
  bf: 0.75,
  prior: 'SAME',
  parent: '4H-ORIGIN-1',       // the macro-origin element (the KCE-Telescoping)
  tf: '1H',
  zfp: 0.62,
  pressure: 'VIRGIN',
  reactionCount: 0,
};

export const OPPOSING_BOM: ZoneModel = {
  id: 'OB-SUPPLY',
  type: 'SUPPLY',
  top: 1.14230,
  bottom: 1.14185,             // the UM 1H BoM supply [1.14230-1.14185] the correction reacts to
  classification: 'BoM',
  formationMs: 1500,
  originIdx: 1,
  bw: 3.2,
  bf: 0.7,
  prior: 'OPPOSITE',
  tf: '1H',
  zfp: 0.55,
};

export const PHANTOM_BARS: OHLCBar[] = [
  { t: 1000, O: 1.14400, H: 1.14430, L: 1.14290, C: 1.14300 }, // pre — the swing high 1.14430
  { t: 2000, O: 1.14300, H: 1.14340, L: 1.14200, C: 1.14230 }, // pre — the swing low 1.14200
  { t: 3000, O: 1.14230, H: 1.14260, L: 1.14150, C: 1.14170 }, // the fakeout — breaks the swing low (1.14150 < 1.14200) + reacts to the OB-SUPPLY bucket
  { t: 5000, O: 1.14170, H: 1.14240, L: 1.14150, C: 1.14240 }, // post — the continuation starts
  { t: 5500, O: 1.14240, H: 1.14310, L: 1.14230, C: 1.14300 }, // post — completes the macro-origin swing
];

export function phantomFixture(): LexiconData {
  return makeData({
    bars: PHANTOM_BARS,
    zones: [PHANTOM_ZONE, OPPOSING_BOM],
    meta: { candidateZoneId: 'PH-1' },
  });
}

// ── the TYPE-1 fixture (the zone-classification REJECT case) ──────────────────
// The REJECT totality: a REJECT-classified zone matches no identity family (the
// bom family's use-exemptor rejectTotality dominates the positives).

export function rejectedZoneFixture(): LexiconData {
  return makeData({
    bars: [
      { t: 1000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
      { t: 2000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
    ],
    zones: [{
      id: 'REJ-1', type: 'DEMAND', top: 1.14100, bottom: 1.14070, classification: 'REJECT',
      formationMs: 1000, originIdx: 1, bw: 1.0, bf: 0.3, prior: 'NONE', tf: '1H', zfp: 0.3,
    }],
    meta: { candidateZoneId: 'REJ-1' },
  });
}

// ── the CANDLE-PRESSURE fixtures ───────────────────────────────────────────────

export const PRESSURE_ZONE: ZoneModel = {
  id: 'Z-1', type: 'DEMAND', top: 1.14100, bottom: 1.14000, classification: 'BoM',
  formationMs: 1000, originIdx: 0, bw: 3.5, bf: 0.7, prior: 'NONE', tf: '1H', zfp: 0.5, pressure: 'VIRGIN', reactionCount: 0,
};

export function defendFixture(): LexiconData {
  // the fromAbove approach + the last touch closes against + the next bar turns up >= max(2p, 0.5xATR)
  return makeData({
    bars: [
      { t: 1000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 }, // pre — above the zone, not touching
      { t: 2000, O: 1.14110, H: 1.14160, L: 1.14010, C: 1.14140 }, // touch — the body defends (bullish against the fromAbove)
      { t: 3000, O: 1.14130, H: 1.14230, L: 1.14160, C: 1.14210 }, // next bar — turned up 0.0008 >= 0.0003, not touching
    ],
    zones: [PRESSURE_ZONE],
    meta: { candidateZoneId: 'Z-1', spot: 1.14200 },
  });
}

export function noReactionTouchFixture(): LexiconData {
  // 2 non-reactive touches fully inside the band — no family's FOR evidence fires
  return makeData({
    bars: [
      { t: 1000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 }, // pre — above the zone
      { t: 2000, O: 1.14030, H: 1.14080, L: 1.14020, C: 1.14040 }, // touch 1 — inside the bucket, no reaction
      { t: 3000, O: 1.14020, H: 1.14090, L: 1.14010, C: 1.14030 }, // touch 2 — inside the bucket, no reaction
    ],
    zones: [PRESSURE_ZONE],
    meta: { candidateZoneId: 'Z-1', spot: 1.14200 },
  });
}

// ── the CANDLE-SHAPE fixtures ──────────────────────────────────────────────────

export const SS_ZONE: ZoneModel = {
  id: 'SS-1', type: 'DEMAND', top: 1.14100, bottom: 1.14000, classification: 'BoM',
  formationMs: 1000, originIdx: 0, bw: 3.0, bf: 0.6, prior: 'NONE', tf: '1H', zfp: 0.25,
};

export function ssFixture(): LexiconData {
  // 4 alternating small candles — bf 0.20, range 0.42 x ATR, zfp 0.25 (the SS signature)
  return makeData({
    bars: [
      { t: 1000, O: 1.14000, H: 1.14013, L: 1.13988, C: 1.14005 },
      { t: 2000, O: 1.14005, H: 1.14018, L: 1.13993, C: 1.14000 },
      { t: 3000, O: 1.14000, H: 1.14013, L: 1.13988, C: 1.14005 },
      { t: 4000, O: 1.14005, H: 1.14018, L: 1.13993, C: 1.14000 },
    ],
    zones: [SS_ZONE],
    meta: { candidateZoneId: 'SS-1', spot: 1.14000 },
  });
}

export function noMatchShapeFixture(): LexiconData {
  // 3 candles, bf 0.5, range 2.0 x ATR — no shape family's FOR evidence fires
  return makeData({
    bars: [
      { t: 1000, O: 1.14000, H: 1.14060, L: 1.13940, C: 1.14060 },
      { t: 2000, O: 1.14060, H: 1.14120, L: 1.14000, C: 1.14000 },
      { t: 3000, O: 1.14000, H: 1.14060, L: 1.13940, C: 1.14060 },
    ],
    zones: [SS_ZONE],
    meta: { candidateZoneId: 'SS-1', spot: 1.14000 },
  });
}

// ── the ZONE-PRESSURE fixtures ─────────────────────────────────────────────────

export function virginBoMFixture(): LexiconData {
  return makeData({
    bars: [
      { t: 1000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
      { t: 2000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
    ],
    zones: [{
      id: 'VB-1', type: 'DEMAND', top: 1.14100, bottom: 1.14070, classification: 'BoM',
      formationMs: 1000, originIdx: 0, bw: 3.4, bf: 0.7, prior: 'NONE', tf: '1H', zfp: 0.5, pressure: 'VIRGIN', reactionCount: 0,
    }],
    meta: { candidateZoneId: 'VB-1' },
  });
}

export function rejectedPressureFixture(): LexiconData {
  return makeData({
    bars: [
      { t: 1000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
      { t: 2000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
    ],
    zones: [{
      id: 'RP-1', type: 'DEMAND', top: 1.14100, bottom: 1.14070, classification: 'REJECT',
      formationMs: 1000, originIdx: 1, bw: 1.0, bf: 0.3, prior: 'NONE', tf: '1H', zfp: 0.3, reactionCount: 0,
    }],
    meta: { candidateZoneId: 'RP-1' },
  });
}

// ── the SHAPE-CHAIN fixtures ───────────────────────────────────────────────────

export const CHAIN_ZONE: ZoneModel = {
  id: 'CH-1', type: 'DEMAND', top: 1.14100, bottom: 1.14000, classification: 'BoM',
  formationMs: 1000, originIdx: 0, bw: 3.0, bf: 0.6, prior: 'NONE', tf: '4H', zfp: 0.55,
};

export function ssToBsFixture(): LexiconData {
  // SS chain + the marubozu breakout candle (bf 1.0, zero wicks, 3x the SS body) + zfp 0.55
  return makeData({
    bars: [{ t: 5000, O: 1.14000, H: 1.14080, L: 1.14000, C: 1.14080 }],
    zones: [CHAIN_ZONE],
    shapeChain: ['SS'],
    meta: { candidateZoneId: 'CH-1', currentShape: 'BS' as const, tf: '1H' },
  });
}

export function emptyChainFixture(): LexiconData {
  // no chain, no zones, two moderate candles — no chain-step FOR evidence fires
  return makeData({
    bars: [
      { t: 1000, O: 1.14000, H: 1.14020, L: 1.13990, C: 1.14010 },
      { t: 2000, O: 1.14010, H: 1.14030, L: 1.14000, C: 1.14020 },
    ],
    zones: [],
    shapeChain: [],
    meta: { tf: '1H' },
  });
}

// ── the OBVIOUS-TRADES fixtures ────────────────────────────────────────────────

export const OBVIOUS_ZONE: ZoneModel = {
  id: 'Z-1', type: 'DEMAND', top: 1.14145, bottom: 1.14000, classification: 'MoM',
  formationMs: 3000, originIdx: 2, bw: 3.0, bf: 0.65, prior: 'SAME', tf: '1H', zfp: 0.55, pressure: 'ACTIVE-1', reactionCount: 1,
};

export function obviousLongFixture(): LexiconData {
  // a tested MoM demand + the E1 map + the E2 storyline + the price forward of the zone
  return makeData({
    bars: [
      { t: 1000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
      { t: 2000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
    ],
    zones: [OBVIOUS_ZONE],
    shapeChain: ['SS', 'BS'],
    e1: { zoneIds: ['Z-1'], direction: 'LONG' },
    e2: { projectionIds: ['E2-1'], strengthDelta: 1 },
    e3: { setups: ['S1'] },
    meta: { candidateZoneId: 'Z-1', spot: 1.14200 },
  });
}

export function emptyTradesFixture(): LexiconData {
  // no zones, no chain, no E1/E2 — no projection FOR evidence fires
  return makeData({
    bars: [
      { t: 1000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
      { t: 2000, O: 1.14200, H: 1.14250, L: 1.14150, C: 1.14200 },
    ],
    zones: [],
    shapeChain: [],
    meta: {},
  });
}
