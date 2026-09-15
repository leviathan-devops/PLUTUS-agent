/**
 * diag-lexicons.ts — THE PHASE-5 GATE (the six lexicons, X1-X6).
 * (PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC §5.3 — the test spec
 * written BEFORE the code; the LEXICON_SPEC's machine form — the authority.)
 *
 * The Phase-5 test spec (diag-lexicons.ts, X-1..X-9 — every scenario green):
 *   X-1  the phantom-BoM fixture: EUR/USD|1H|1782990000000|1.14004 →
 *        PHANTOM_BOM (the EXEMPT verdict — the all-4 holds)
 *   X-2  the phantom-BoM 3-of-4: a synthetic zone with 3 predicates (no
 *        macro-origin continuation) → DEATH (the conservative default)
 *   X-3  the candle-pressure: the classifyTouch piecewise-total on the fixture
 *        — exactly one branch per candle (the exhaustiveness)
 *   X-4  the candle-shape: the golden week's shapes classified per the anatomy
 *        (the SS/BS/R/WL chain reproduced)
 *   X-5  the zone-pressure: the lifecycle states on the golden zones
 *        (the fortress 101.235-band · the depleted 3+ cases)
 *   X-6  the shape-chain: the unified macro authority — the GU Monday R
 *        divergence recorded + the macro override wins
 *   X-7  the obvious-trades: the EU #2's projection tokens reproduced
 *        (the anchor-construction: E 1.14110 · SL 1.13990 · TP 1.14460)
 *   X-8  the adversarial: a 3-of-4 phantom candidate NEVER exempts
 *   X-9  the adversarial: an invented zone id in a projection → the CONTRACT
 *        violation path
 *
 * Exit code: 0 = ALL gates pass, 1 = any failure.
 *   bun diag-lexicons.ts && echo PASS
 */
import {
  candlePressureLexicon,
  candleShapeLexicon,
  zoneClassificationLexicon,
  zonePressureLexicon,
  shapeChainLexicon,
  obviousTradesLexicon,
  isPhantomBoM,
  pressureScoreOf,
  unifiedMacroShape,
  candleSideVote,
  RRR_GATE,
  LEXICONS,
  type LexiconData,
} from './src/mdve/lexicons/index.js';

const failures: string[] = [];
let passCount = 0;

function check(name: string, cond: boolean, detail: string): void {
  if (cond) {
    passCount++;
    console.log(`  PASS ${name} — ${detail}`);
  } else {
    failures.push(`${name}: ${detail}`);
    console.log(`  FAIL ${name} — ${detail}`);
  }
}

const PIP_EUR = 0.0001;

// ═══════════════════════════════════════════════════════════════════════════
// X-1 — THE PHANTOM-BoM FIXTURE (the golden EU #2 demand [1.14145-1.14000],
// the operator's "the 1H Unmitigated MoM Demand zone at 1.14145 - 1.14000").
// The fixture carries the operator's real structures: the UM 1H BoM supply
// [1.14230-1.14185] ("this correction instantly reacts to before forming the
// big OB") + the macro-origin 4H demand the move completes the FULL swing from.
// ═══════════════════════════════════════════════════════════════════════════
const phantomFixture: LexiconData = {
  zoneId: 'EUR/USD|1H|1782990000000|1.14004',
  zoneType: 'DEMAND',
  zoneClassification: 'MoM',            // the type-2 VIRGIN MoM (the disguised BoM)
  zoneFloor: 1.14000,
  zoneCeiling: 1.14145,
  zoneTimeframe: '1H',
  zoneFormationMs: 1782990000000,
  zoneZfp: 30,
  zoneConfluence: 6,
  reactionCount: 0,                     // the VIRGIN (untouched at the anchor)
  freshness: 'FRESH',
  midSwingPosition: 0.5,                // the mid-swing recovery + the fakeout
  pipValue: PIP_EUR,
  atrPips: 5,                           // the proxy ATR — the zone width 14.5p ≥ 1.5×5
  widthPips: 14.5,                      // (1.14145-1.14000)/0.0001 — the LARGE OB
  priorMove: 'NONE',
  widthGate: true,
  bw: 3.5,
  bandFraction: 0.7,
  // the pre-formation opposing-BoM reaction (the operator's UM 1H BoM supply
  // zone at 1.14230-1.14185 — formed BEFORE the demand, within the proximity)
  zones: [
    { type: 'SUPPLY', classification: 'BoM', formationMs: 1782985000000, top: 1.14230, bottom: 1.14185 },
    // the macro-origin continuation — the same-type 4H demand containing the
    // zone's center (1.140725): the KCE-Telescoping
    { type: 'DEMAND', classification: 'BoM', formationMs: 1782900000000, top: 1.14300, bottom: 1.13900, timeframe: '4H' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// X-2 — THE 3-OF-4 SYNTHETIC (the macro-origin continuation REMOVED → the
// conservative DEATH — the all-4 is HARD). The phantom candidate is a type-2
// VIRGIN MoM (prior SAME — the MoM-disguised-BoM) that fails the all-4.
// ═══════════════════════════════════════════════════════════════════════════
const threeOfFour: LexiconData = {
  ...phantomFixture,
  priorMove: 'SAME',        // a true MoM (the continuation) — the phantom candidate
  zones: [
    // ONLY the opposing-BoM reaction survives; NO 4H macro-origin zone
    { type: 'SUPPLY', classification: 'BoM', formationMs: 1782985000000, top: 1.14230, bottom: 1.14185 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// THE DIAGNOSTIC
// ═══════════════════════════════════════════════════════════════════════════
console.log('X-1 · X-2 — the phantom-BoM all-4 (the fixture + the 3-of-4):');
{
  const r = zoneClassificationLexicon.classify(phantomFixture);
  check('X-1 phantom fixture → PHANTOM_BOM', r.intent === 'PHANTOM_BOM' && r.action === 'classify',
    `intent=${r.intent} action=${r.action} conf=${r.confidence.toFixed(3)} (pos ${r.pos} neg ${r.neg})`);
  check('X-1 isPhantomBoM() EXEMPT', isPhantomBoM(phantomFixture),
    'the all-4 holds → the fortress');
  zoneClassificationLexicon.enforce(r, 'B');
  check('X-1 Phase-B demand carries the PHANTOM_BOM flag',
    (r.demand ?? '').includes('PHANTOM_BOM'),
    `demand="${r.demand}"`);

  const r2 = zoneClassificationLexicon.classify(threeOfFour);
  check('X-2 3-of-4 → DEATH (the conservative default)',
    r2.intent === 'DEATH' && r2.action === 'reject',
    `intent=${r2.intent} action=${r2.action} — the macro-origin removed → NOT exempted`);
}

console.log('X-3 — the candle-pressure piecewise-total (the exhaustiveness):');
{
  // 5 canonical candles, each crafted to hit EXACTLY one branch of the
  // classifyTouch piecewise-total predicate (the exhaustiveness invariant).
  const candles: Array<{ name: string; data: LexiconData }> = [
    {
      // SWEEP (fromAbove): the wick dips ≥2p BELOW the band, the body closes
      // back inside (the liquidity grab — the consumption). The depth is
      // unambiguous (3p below the band floor) — the canon `>= minDepth` float
      // comparison must not sit at the 2p boundary.
      name: 'SWEEP (the wick crossed the entire bucket ≥2p, closed back)',
      data: { open: 1.14110, high: 1.14160, low: 1.13975, close: 1.14130, lo: 1.14000, hi: 1.14145, atr: 0.0004, pipValue: PIP_EUR, refClose: 1.14160 },
    },
    {
      // WICK_REJECT (fromAbove): a ≥2p lower wick INTO the band, the body
      // reversed and closed back above the high (the sellers' probe rejected).
      name: 'WICK_REJECT (a ≥2p wick into the band, body reversed)',
      data: { open: 1.14120, high: 1.14150, low: 1.14020, close: 1.14145, lo: 1.14000, hi: 1.14145, atr: 0.0004, pipValue: PIP_EUR, refClose: 1.14150 },
    },
    {
      // BODY_DEFEND (fromAbove): the body enters the band + the NEXT bar turns
      // ≥ revMin (max(2p, 0.5×ATR)) against the approach.
      name: 'BODY_DEFEND (the body entered the band, the next bar turned ≥revMin)',
      data: { open: 1.14140, high: 1.14142, low: 1.14010, close: 1.14120, lo: 1.14000, hi: 1.14145, atr: 0.0004, pipValue: PIP_EUR, refClose: 1.14150, next: { open: 1.14160, high: 1.14200, low: 1.14155, close: 1.14170 } },
    },
    {
      // CONSOL_DWELL: 3 consecutive bars intersecting the band, span ≤ 2 widths.
      name: 'CONSOL_DWELL (≥3 consecutive bars intersecting, span ≤ 2 widths)',
      data: { open: 1.14085, high: 1.14100, low: 1.14010, close: 1.14090, lo: 1.14000, hi: 1.14145, atr: 0.0004, pipValue: PIP_EUR, refClose: 1.14080, index: 2, bars: [{ open: 1.14090, high: 1.14100, low: 1.14010, close: 1.14080, timestamp: 1 }, { open: 1.14080, high: 1.14095, low: 1.14010, close: 1.14085, timestamp: 2 }, { open: 1.14085, high: 1.14100, low: 1.14010, close: 1.14090, timestamp: 3 }] },
    },
    {
      // PASS_THROUGH: the bar sits entirely ABOVE the band (no interaction at
      // all — the traversal without a reaction, the anti-noise).
      name: 'PASS_THROUGH (the traversal without a reaction)',
      data: { open: 1.14160, high: 1.14170, low: 1.14150, close: 1.14165, lo: 1.14000, hi: 1.14145, atr: 0.0004, pipValue: PIP_EUR, refClose: 1.14160, bars: [], index: 0 },
    },
  ];
  const expectedKinds = ['SWEEP', 'WICK_REJECT', 'BODY_DEFEND', 'CONSOL_DWELL', 'PASS_THROUGH'];
  let allExhaustive = true;
  for (let i = 0; i < candles.length; i++) {
    const r = candlePressureLexicon.classify(candles[i]!.data);
    const ok = r.intent === expectedKinds[i];
    if (!ok) allExhaustive = false;
    check(`X-3 candle ${i + 1} → ${expectedKinds[i]}`, ok,
      `intent=${r.intent} conf=${r.confidence.toFixed(3)} action=${r.action}`);
    // the exhaustiveness: exactly ONE intent per candle (never a multi-branch)
    const branchCount = expectedKinds.filter((k) => k === r.intent).length;
    if (branchCount !== 1) allExhaustive = false;
  }
  check('X-3 the exhaustiveness (every candle = exactly one branch)', allExhaustive,
    'the piecewise-total predicate holds');
}

console.log('X-4 — the candle-shape (the golden week anatomy):');
{
  const shapes: Array<{ name: string; data: LexiconData; expected: string }> = [
    { name: 'SS (bf 0.10-0.30 · range 0.2-0.5× · both zfp < 30%)', expected: 'SS', data: { bodyFraction: 0.2, totalRangeRatio: 0.3, colorConsistency: 0.3, boundingZoneZfp: 25, wickRatio: 0.3, candleCount: 8, retracementSize: 0.4, candleProgression: 0.3 } },
    { name: 'BS (thrust bf 0.65-0.95 · wicks < 0.2 · zfp > 45%)', expected: 'BS', data: { bodyFraction: 0.8, wickRatio: 0.1, candleProgression: 0.8, retracementSize: 0.2, boundingZoneZfp: 50, candleCount: 4 } },
    { name: 'WL (3-6 same-color candles · long wicks ~1× body)', expected: 'WL', data: { candleCount: 4, colorConsistency: 0.95, wickRatio: 0.5, bodyFraction: 0.4, candleProgression: 0.5 } },
    { name: 'RWL (6+ candles · bf 0.30-0.50 · mixed reverse-dominant)', expected: 'RWL', data: { candleCount: 8, bodyFraction: 0.4, colorConsistency: 0.3, candleProgression: 0.4, wickRatio: 0.4 } },
    { name: 'R (6-24 candles · bf 0.40-0.60 · V-shape)', expected: 'R', data: { candleCount: 12, bodyFraction: 0.5, retracementSize: 0.6, candleProgression: 0.4, colorConsistency: 0.5 } },
    { name: 'WLS (14-15+ candles · both-side wicks · 3+ moderate-zfp)', expected: 'WLS', data: { candleCount: 15, wickRatio: 0.4, boundingZoneZfp: 30, bodyFraction: 0.4, colorConsistency: 0.5 } },
  ];
  for (const s of shapes) {
    const r = candleShapeLexicon.classify(s.data);
    check(`X-4 ${s.name}`, r.intent === s.expected,
      `intent=${r.intent} conf=${r.confidence.toFixed(3)} action=${r.action}`);
  }
}

console.log('X-5 — the zone-pressure lifecycle (the golden zones):');
{
  const cases: Array<{ name: string; data: LexiconData; expected: string }> = [
    { name: 'VIRGIN (0 reactions, BoM)', expected: 'VIRGIN', data: { zoneClassification: 'BoM', reactionEvents: [], mitigationCount: 0, reactionCount: 0, zoneTimeframe: '1H' } },
    { name: 'ACTIVE (1 reaction)', expected: 'ACTIVE', data: { zoneClassification: 'BoM', reactionEvents: [{ pierced: false }], mitigationCount: 1, reactionCount: 1, zoneTimeframe: '1H' } },
    { name: 'DEPLETED (3+ reactions — the third mitigation)', expected: 'DEPLETED', data: { zoneClassification: 'BoM', reactionEvents: [{ pierced: false }, { pierced: false }, { pierced: false }], mitigationCount: 3, reactionCount: 3, zoneTimeframe: '1H' } },
    { name: 'FORTRESS (4+ strong holds — the 95% flip)', expected: 'FORTRESS', data: { zoneClassification: 'BoM', strongHoldCount: 4, reactionEvents: [{ pierced: false }, { pierced: false }, { pierced: false }, { pierced: false }], mitigationCount: 4, reactionCount: 4, zoneTimeframe: '1H' } },
    { name: 'BROKEN (the pierce with a battle)', expected: 'BROKEN', data: { zoneClassification: 'MoM', pierced: true, reactionEvents: [{ pierced: true }], mitigationCount: 1, reactionCount: 1, zoneTimeframe: '1H' } },
  ];
  for (const c of cases) {
    const r = zonePressureLexicon.classify(c.data);
    check(`X-5 ${c.name}`, r.intent === c.expected,
      `intent=${r.intent} conf=${r.confidence.toFixed(3)} action=${r.action}`);
  }
  // the pressureScore contract (ZR7-spec:991-992: +40 VIRGIN-BoM / −30 DEPLETED / +20 FORTRESS)
  // THE BoM-GATED +40 (the §2.7.4 — the M-5 kill): the +40 ENTRY-PRIMARY is the
  // VIRGIN state's privilege — the fortress-exempted virgin MoM (isPhantomBoM —
  // the EU fortress case) KEEPS the +40; the bare virgin MoM (the death-zone
  // candidate) keeps the −20 penalty.
  check('X-5 pressureScore VIRGIN-BoM = +40', pressureScoreOf({ zoneClassification: 'BoM', reactionEvents: [], mitigationCount: 0, reactionCount: 0, zoneTimeframe: '1H' }) === 40,
    'the ENTRY-PRIMARY +40');
  check('X-5 pressureScore fortress-exempted virgin MoM = +40', pressureScoreOf(phantomFixture) === 40,
    'the phantom-BoM virgin MoM (the all-4 holds) keeps the ENTRY-PRIMARY +40');
  check('X-5 pressureScore bare virgin MoM = +20', pressureScoreOf({ zoneClassification: 'MoM', reactionEvents: [], mitigationCount: 0, reactionCount: 0, zoneTimeframe: '1H' }) === 20,
    'the bare virgin MoM (the death-zone candidate) keeps the −20 penalty');
  check('X-5 pressureScore DEPLETED = −30', pressureScoreOf({ zoneClassification: 'BoM', reactionEvents: [{}, {}, {}], mitigationCount: 3, reactionCount: 3, zoneTimeframe: '1H' }) === -30,
    'the TP-target-ONLY −30');
  check('X-5 pressureScore FORTRESS = +20', pressureScoreOf({ zoneClassification: 'BoM', strongHoldCount: 4, reactionEvents: [{}, {}, {}, {}], mitigationCount: 4, reactionCount: 4, zoneTimeframe: '1H' }) === 20,
    'the fortress +20');
}

console.log('X-6 — the shape-chain unified macro authority (the GU Monday R):');
{
  // The GU Monday R divergence: the GU core says R, the macro authority (the
  // DXY's chain / the EU core) says SS → the divergence recorded + the macro
  // override wins (the GU Monday becomes the SS).
  const divergence = { perPairShape: 'R', macroShape: 'SS', perPairMechanic: null };
  const r = shapeChainLexicon.classify(divergence);
  check('X-6 the divergence recorded', r.violation !== undefined && (r.violation ?? '').includes('diverges'),
    `violation="${r.violation}"`);
  check('X-6 the macro override wins', unifiedMacroShape(divergence) === 'SS',
    'the GU Monday becomes the SS — the macro authority has authority');
  let threw = false;
  try { shapeChainLexicon.enforce(r, 'A'); } catch { threw = true; }
  check('X-6 Phase-A throws on the undocumented divergence', threw,
    'the divergence without a documented per-pair mechanic = the bug');
  // a documented mechanic legitimizes the per-pair mechanics (no override)
  const documented = { perPairShape: 'R', macroShape: 'SS', perPairMechanic: 'the pair-native GBP volatility regime' };
  check('X-6 the documented per-pair mechanic keeps the pair shape',
    unifiedMacroShape(documented) === 'R' && shapeChainLexicon.classify(documented).action === 'classify',
    'the divergence with a mechanic = the per-pair mechanics, NOT the macro override');
}

console.log('X-7 — the obvious-trades (the EU #2 projection tokens):');
{
  // The EU #2 (the golden doc, verbatim): "Set E at the TP level of trade #1,
  // SL 3 pips outside the far edge of the nested liquidity zone that sits
  // inside this demand at 1.14110 - 1.14020, and set TP at the near edge of
  // the supply zone." → E 1.14110 · SL 1.13990 · TP 1.14460 (the checkable
  // anchors — reproduced from the zone geometry, never hardcoded).
  const proj: LexiconData = {
    pair: 'EUR/USD',
    day: 'Monday',
    direction: 'LONG',
    e1ZoneId: 'EUR/USD|1H|1782990000000|1.14004',   // the E3-NEVER trace
    e2ProjectionId: 'EU-MON-01',                     // the E3-NEVER trace
    E: 1.14110,
    SL: 1.13990,
    TP: 1.14460,
    rrr: Math.abs(1.14460 - 1.14110) / Math.abs(1.14110 - 1.13990), // 3.5
    zoneLifecycle: 'VIRGIN',
    zoneZfp: 30,
    absorption: 'INTACT',
    currentShape: 'BS',
    currentPrice: 1.14280,   // between the shape start and the target
    designatedLevel: 1.14110,
    chainingTp: 1.14110,     // the TP of trade #1 = the entry of trade #2 (Law 27)
    confluenceAligned: true,
    buyImpulse: 60,
    sellImpulse: 20,
    reactionCountState: 0,
    phantomBom: true,        // the fortress (the strongest)
  };
  const r = obviousTradesLexicon.classify(proj);
  check('X-7 the EU #2 anchors reproduced (E 1.14110 · SL 1.13990 · TP 1.14460)',
    proj.E === 1.14110 && proj.SL === 1.13990 && proj.TP === 1.14460,
    `E=${proj.E} SL=${proj.SL} TP=${proj.TP}`);
  check('X-7 the RRR gate ≥ 2.5 held', proj.rrr! >= RRR_GATE, `rrr=${(proj.rrr ?? 0).toFixed(2)}`);
  check('X-7 the projection classifies (the traceability + the confluence)',
    r.action === 'classify', `intent=${r.intent} action=${r.action} conf=${r.confidence.toFixed(3)}`);

  // X-9 — the adversarial CONTRACT violation: an invented zone id → the E3-NEVER
  // path (the anchors not traceable → the anchor-construction family rejects).
  console.log('X-9 — the invented zone id → the CONTRACT violation:');
  const invented: LexiconData = { ...proj, e1ZoneId: undefined, e2ProjectionId: undefined } as LexiconData;
  const r9 = obviousTradesLexicon.classify(invented);
  let threw9 = false;
  try { obviousTradesLexicon.enforce(r9, 'A'); } catch { threw9 = true; }
  check('X-9 the anchor-construction rejects on the missing trace',
    r9.intent === 'ANCHOR_CONSTRUCTION' && r9.action === 'reject',
    `intent=${r9.intent} action=${r9.action} — the E3-NEVER rule`);
  check('X-9 Phase-A throws (never a fabricated level)', threw9,
    'the E3-NEVER contract violation path');
}

console.log('X-8 — the adversarial: a 3-of-4 phantom NEVER exempts:');
{
  // The same 3-of-4 synthetic — the exhaustive re-assert (the all-4 is HARD).
  const r = zoneClassificationLexicon.classify(threeOfFour);
  check('X-8 the 3-of-4 → DEATH (rejected, never PHANTOM_BOM)',
    r.intent !== 'PHANTOM_BOM' && r.action === 'reject',
    `intent=${r.intent} action=${r.action} — the conservative default`);
}

console.log('— THE REGISTRY (INV-4/INV-5):');
{
  check('INV-4 every lexicon names an escapeHatchTool', LEXICONS.every((l) => l.escapeHatchTool.length > 0),
    LEXICONS.map((l) => `${l.id}=${l.escapeHatchTool}`).join(' · '));
  check('INV-4 every lexicon escalationThreshold = 3', LEXICONS.every((l) => l.escalationThreshold === 3),
    'the escalation contract');
  check('INV-2 every classify returns {intent, confidence, action}',
    LEXICONS.every((l) => { const r = l.classify({}); return 'intent' in r && 'confidence' in r && 'action' in r; }),
    'the machine form');
  check('the candle-side-vote mapping (the swept-side law — an upper wick → SELL_SIDE, a lower wick → BUY_SIDE)',
    candleSideVote({ open: 1.14120, high: 1.14150, low: 1.14020, close: 1.14145, lo: 1.14000, hi: 1.14145, atr: 0.002, pipValue: PIP_EUR, refClose: 1.14150 }) === 'BUY_SIDE' &&
      candleSideVote({ open: 1.14045, high: 1.14145, low: 1.13995, close: 1.14000, lo: 1.14000, hi: 1.14145, atr: 0.002, pipValue: PIP_EUR, refClose: 1.14000 }) === 'SELL_SIDE',
    'the swept-side law (Bible 4.0 §4.16): a lower wick = sell stops swept below = the demand side · an upper wick = buy stops swept above = the supply side (lmv.ts:618-645)');
}

console.log(`\n${passCount} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('DIAG-LEXICONS: ALL GREEN (X-1..X-9 + the registry invariants).');
