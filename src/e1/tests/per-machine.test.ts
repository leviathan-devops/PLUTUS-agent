// Plutus V5 W2 — src/e1/tests/per-machine.test.ts
// 12 hand-computed cases per machine x 6 = 72 (spec B.W2.6 + matrix W2 row).
// Doctrine: B.W2.3 (the six machine specs); D13: case descriptions cite the
// doctrine line. Every expectation was derived by reading the machine's
// predicates (machines/*.ts) + verified by execution — a wrong classification
// MUST fail. The fail-closed law (engine.ts:100-112: a throwing predicate
// counts as a HIT) explains the lenient cases; each cites it explicitly.
// bun test src/e1/tests/per-machine.test.ts
import { describe, expect, test } from 'bun:test';
import {
  candlePressureMachine, candleShapeMachine, zoneClassificationMachine,
  zonePressureMachine, shapeChainMachine, obviousTradesMachine,
} from '../machines/index';
import {
  makeData, phantomFixture, rejectedZoneFixture, defendFixture,
  noReactionTouchFixture, ssFixture, noMatchShapeFixture, virginBoMFixture,
  rejectedPressureFixture, ssToBsFixture, emptyChainFixture, obviousLongFixture,
  emptyTradesFixture, PRESSURE_ZONE, SS_ZONE, CHAIN_ZONE, PHANTOM_BARS,
  PHANTOM_ZONE, OPPOSING_BOM,
} from './fixtures';
import type { LexiconData, MachineRule, ZoneModel } from '../core/types';

interface Case { name: string; machine: MachineRule; data: LexiconData; expectClassify: boolean; }

const defendBars = [
  { t: 1000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
  { t: 2000, O: 1.1411, H: 1.1416, L: 1.1401, C: 1.1414 },
  { t: 3000, O: 1.1413, H: 1.1423, L: 1.1416, C: 1.1421 },
];
const D = (bars: any[], zones: any[], meta: any = {}): LexiconData => makeData({ bars, zones, meta });
const zcZone = (o: Partial<ZoneModel>): ZoneModel => ({
  id: 'ZC-X', type: 'DEMAND', top: 1.141, bottom: 1.14, classification: 'BoM',
  formationMs: 1000, originIdx: 0, bw: 3.5, bf: 0.7, prior: 'NONE', tf: '1H', zfp: 0.5, ...o,
});
const zpZone = (o: Partial<ZoneModel>): ZoneModel => ({
  id: 'ZP-X', type: 'DEMAND', top: 1.141, bottom: 1.1407, classification: 'BoM',
  formationMs: 1000, originIdx: 0, bw: 3.4, bf: 0.7, prior: 'NONE', tf: '1H',
  zfp: 0.5, pressure: 'VIRGIN', reactionCount: 0, ...o,
});
const zcBars = [
  { t: 1000, O: 1.139, H: 1.1395, L: 1.1385, C: 1.1394 },
  { t: 2000, O: 1.1394, H: 1.1412, L: 1.1392, C: 1.141 },
];
const zpBars = [
  { t: 1000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
  { t: 2000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
];
const OT_BASE: any = {
  bars: [
    { t: 1000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
    { t: 2000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
  ],
  zones: [{ id: 'Z-1', type: 'DEMAND', top: 1.14145, bottom: 1.14, classification: 'MoM', formationMs: 3000, originIdx: 2, bw: 3, bf: 0.65, prior: 'SAME', tf: '1H', zfp: 0.55, pressure: 'ACTIVE-1', reactionCount: 1 }],
  shapeChain: ['SS', 'BS'],
  e1: { zoneIds: ['Z-1'], direction: 'LONG' },
  e2: { projectionIds: ['E2-1'], strengthDelta: 1 },
  e3: { setups: ['S1'] },
  meta: { candidateZoneId: 'Z-1', spot: 1.142 },
};
const ot = (o: any): LexiconData => makeData({ ...OT_BASE, ...o });
const sc = (bars: any[], chain: any[], cur: any): LexiconData =>
  makeData({ bars, zones: [CHAIN_ZONE], shapeChain: chain, meta: { candidateZoneId: 'CH-1', currentShape: cur, tf: '1H' } });
const ssBars = [
  { t: 1000, O: 1.14, H: 1.14013, L: 1.13988, C: 1.14005 },
  { t: 2000, O: 1.14005, H: 1.14018, L: 1.13993, C: 1.14 },
  { t: 3000, O: 1.14, H: 1.14013, L: 1.13988, C: 1.14005 },
  { t: 4000, O: 1.14005, H: 1.14018, L: 1.13993, C: 1.14 },
];

const CP: Case[] = [
  { name: 'cp-01 body-defend fromAbove + turn-up (B.W2.3-M1 defend family)', machine: candlePressureMachine, data: defendFixture(), expectClassify: true },
  { name: 'cp-02 two dead touches, no reaction (B.W2.3-M1: no FOR fires)', machine: candlePressureMachine, data: noReactionTouchFixture(), expectClassify: false },
  { name: 'cp-03 full-bucket sweep = consumption (reactionCount+=1)', machine: candlePressureMachine, data: D([
    { t: 1000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
    { t: 2000, O: 1.1415, H: 1.1425, L: 1.1395, C: 1.1398 },
    { t: 3000, O: 1.1398, H: 1.1405, L: 1.139, C: 1.1395 },
  ], [PRESSURE_ZONE], { candidateZoneId: 'Z-1', spot: 1.1395 }), expectClassify: true },
  { name: 'cp-04 wick pierce + close back inside (reject family)', machine: candlePressureMachine, data: D([
    { t: 1000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
    { t: 2000, O: 1.1412, H: 1.1413, L: 1.1397, C: 1.1411 },
    { t: 3000, O: 1.1411, H: 1.1418, L: 1.1409, C: 1.1415 },
  ], [PRESSURE_ZONE], { candidateZoneId: 'Z-1', spot: 1.1415 }), expectClassify: true },
  { name: 'cp-05 body closes through + continues (passThrough family)', machine: candlePressureMachine, data: D([
    { t: 1000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
    { t: 2000, O: 1.1412, H: 1.1415, L: 1.1395, C: 1.1397 },
    { t: 3000, O: 1.1397, H: 1.14, L: 1.1385, C: 1.1388 },
  ], [PRESSURE_ZONE], { candidateZoneId: 'Z-1', spot: 1.1388 }), expectClassify: true },
  { name: 'cp-06 dwell inside band (consol-dwell family)', machine: candlePressureMachine, data: D([
    { t: 1000, O: 1.1405, H: 1.1407, L: 1.1403, C: 1.1405 },
    { t: 2000, O: 1.1405, H: 1.1407, L: 1.1403, C: 1.1404 },
    { t: 3000, O: 1.1404, H: 1.1406, L: 1.1402, C: 1.1405 },
  ], [PRESSURE_ZONE], { candidateZoneId: 'Z-1', spot: 1.1405 }), expectClassify: true },
  { name: 'cp-07 bars far from zone (fail-closed: passedThrough HIT on empty touch set)', machine: candlePressureMachine, data: D([
    { t: 1000, O: 1.15, H: 1.1505, L: 1.1495, C: 1.15 },
    { t: 2000, O: 1.15, H: 1.1505, L: 1.1495, C: 1.1501 },
  ], [PRESSURE_ZONE], { candidateZoneId: 'Z-1', spot: 1.15 }), expectClassify: true },
  { name: 'cp-08 empty bars + zone present (fail-closed engine.ts:108-112)', machine: candlePressureMachine, data: D([], [PRESSURE_ZONE], { candidateZoneId: 'Z-1' }), expectClassify: true },
  { name: 'cp-09 triple full sweep = depletion feed (3-reaction exemptor)', machine: candlePressureMachine, data: D([
    { t: 1000, O: 1.142, H: 1.143, L: 1.139, C: 1.1395 },
    { t: 2000, O: 1.1395, H: 1.143, L: 1.139, C: 1.1425 },
    { t: 3000, O: 1.1425, H: 1.143, L: 1.139, C: 1.1395 },
    { t: 4000, O: 1.1395, H: 1.143, L: 1.139, C: 1.1425 },
  ], [PRESSURE_ZONE], { candidateZoneId: 'Z-1', spot: 1.1425 }), expectClassify: true },
  { name: 'cp-10 weak in-band touches then drift (no family sustains FOR)', machine: candlePressureMachine, data: D([
    { t: 1000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
    { t: 2000, O: 1.1403, H: 1.1408, L: 1.1402, C: 1.1404 },
    { t: 3000, O: 1.1404, H: 1.1409, L: 1.1401, C: 1.1405 },
  ], [PRESSURE_ZONE], { candidateZoneId: 'Z-1', spot: 1.1405 }), expectClassify: false },
  { name: 'cp-11 no zones (fail-closed: singleBarTouch-path HIT)', machine: candlePressureMachine, data: D(defendBars, [], {}), expectClassify: true },
  { name: 'cp-12 fully empty (fail-closed floor: pos>neg via throw-HIT)', machine: candlePressureMachine, data: makeData({ bars: [], zones: [] }), expectClassify: true },
];

const CS: Case[] = [
  { name: 'cs-01 SS consolidation 4 alternating small bodies (B.W2.3-M2 ss)', machine: candleShapeMachine, data: ssFixture(), expectClassify: true },
  { name: 'cs-02 mid-bf chop, no piece matches (B.W2.3-M2: all FOR silent)', machine: candleShapeMachine, data: noMatchShapeFixture(), expectClassify: false },
  { name: 'cs-03 marubozu thrust pair (bs family)', machine: candleShapeMachine, data: D([
    { t: 1000, O: 1.14, H: 1.1402, L: 1.1399, C: 1.1401 },
    { t: 2000, O: 1.1401, H: 1.1425, L: 1.1401, C: 1.1425 },
    { t: 3000, O: 1.1425, H: 1.1445, L: 1.1425, C: 1.1445 },
  ], [SS_ZONE], { candidateZoneId: 'SS-1', spot: 1.1445 }), expectClassify: true },
  { name: 'cs-04 3-bar V-reversal (no WL FOR fires on this geometry — sensitivity lock)', machine: candleShapeMachine, data: D([
    { t: 1000, O: 1.144, H: 1.1442, L: 1.142, C: 1.1422 },
    { t: 2000, O: 1.1422, H: 1.1424, L: 1.14, C: 1.1402 },
    { t: 3000, O: 1.1402, H: 1.1428, L: 1.14, C: 1.1426 },
  ], [SS_ZONE], { candidateZoneId: 'SS-1', spot: 1.1426 }), expectClassify: false },
  { name: 'cs-05 instant 2-bar reversal (rwl family)', machine: candleShapeMachine, data: D([
    { t: 1000, O: 1.14, H: 1.142, L: 1.1398, C: 1.1418 },
    { t: 2000, O: 1.1418, H: 1.142, L: 1.1395, C: 1.1397 },
  ], [SS_ZONE], { candidateZoneId: 'SS-1', spot: 1.1397 }), expectClassify: true },
  { name: 'cs-06 slow 3-bar retrace (no R FOR fires — documents R threshold)', machine: candleShapeMachine, data: D([
    { t: 1000, O: 1.14, H: 1.1425, L: 1.14, C: 1.1423 },
    { t: 2000, O: 1.1423, H: 1.1426, L: 1.141, C: 1.1412 },
    { t: 3000, O: 1.1412, H: 1.1415, L: 1.1405, C: 1.1408 },
  ], [SS_ZONE], { candidateZoneId: 'SS-1', spot: 1.1408 }), expectClassify: false },
  { name: 'cs-07 4-bar contested whiplash storm (no WLS FOR fires — documents storm threshold)', machine: candleShapeMachine, data: D([
    { t: 1000, O: 1.141, H: 1.1425, L: 1.1405, C: 1.1408 },
    { t: 2000, O: 1.1408, H: 1.1415, L: 1.1395, C: 1.1412 },
    { t: 3000, O: 1.1412, H: 1.1428, L: 1.1408, C: 1.141 },
    { t: 4000, O: 1.141, H: 1.1418, L: 1.1398, C: 1.1415 },
  ], [SS_ZONE], { candidateZoneId: 'SS-1', spot: 1.1415 }), expectClassify: false },
  { name: 'cs-08 single moderate candle (bs-middle/suggestive path)', machine: candleShapeMachine, data: D(
    [{ t: 1000, O: 1.14, H: 1.1405, L: 1.1395, C: 1.1404 }], [SS_ZONE], { candidateZoneId: 'SS-1' }), expectClassify: true },
  { name: 'cs-09 bearish engulf pair (singleBigCandle substitute weight)', machine: candleShapeMachine, data: D([
    { t: 1000, O: 1.141, H: 1.1412, L: 1.1402, C: 1.1404 },
    { t: 2000, O: 1.1404, H: 1.142, L: 1.1402, C: 1.1419 },
  ], [SS_ZONE], { candidateZoneId: 'SS-1', spot: 1.1419 }), expectClassify: true },
  { name: 'cs-10 wide-range 3-bar chop (cleanConsolidation descriptive dominates)', machine: candleShapeMachine, data: D([
    { t: 1000, O: 1.14, H: 1.1415, L: 1.1385, C: 1.1412 },
    { t: 2000, O: 1.1412, H: 1.1418, L: 1.139, C: 1.1393 },
    { t: 3000, O: 1.1393, H: 1.141, L: 1.138, C: 1.1408 },
  ], [SS_ZONE], { candidateZoneId: 'SS-1', spot: 1.1408 }), expectClassify: false },
  { name: 'cs-11 fully empty (fail-closed: singleBigCandle HIT via throw)', machine: candleShapeMachine, data: makeData({ bars: [], zones: [] }), expectClassify: true },
  { name: 'cs-12 bars but no zones (anatomy needs zone context — reject)', machine: candleShapeMachine, data: D(defendBars, [], {}), expectClassify: false },
];

const ZC: Case[] = [
  { name: 'zc-01 phantom all-4 (B.W2.3-M3: largeOb+fakeout+preFormation+macroOrigin)', machine: zoneClassificationMachine, data: phantomFixture(), expectClassify: true },
  { name: 'zc-02 REJECT totality (rejectTotality exemptor dominates)', machine: zoneClassificationMachine, data: rejectedZoneFixture(), expectClassify: false },
  { name: 'zc-03 plain BoM origin (priorOppositeOrNone + gates pass)', machine: zoneClassificationMachine, data: D(zcBars, [zcZone({ id: 'ZC-B' })], { candidateZoneId: 'ZC-B' }), expectClassify: true },
  { name: 'zc-04 MoM continuation (priorContinuationSame)', machine: zoneClassificationMachine, data: D(zcBars, [zcZone({ id: 'ZC-M', classification: 'MoM', prior: 'SAME', bottom: 1.1395, top: 1.1405, bw: 3.2, bf: 0.68 })], { candidateZoneId: 'ZC-M' }), expectClassify: true },
  { name: 'zc-05 fortress pressure + 5 reactions (fortressBom family)', machine: zoneClassificationMachine, data: D(zcBars, [zcZone({ id: 'ZC-F', pressure: 'FORTRESS', reactionCount: 5, bottom: 1.1395, top: 1.1405 })], { candidateZoneId: 'ZC-F' }), expectClassify: true },
  { name: 'zc-06 IP 9-pillar confluence (ninePillarConfluence)', machine: zoneClassificationMachine, data: D(zcBars, [zcZone({ id: 'ZC-IP', classification: 'IP', source: 'PILLAR', bottom: 1.1395, top: 1.1405 })], { candidateZoneId: 'ZC-IP' }), expectClassify: true },
  { name: 'zc-07 LSZ label (lsz family)', machine: zoneClassificationMachine, data: D(zcBars, [zcZone({ id: 'ZC-L', classification: 'LSZ', bottom: 1.1395, top: 1.1405 })], { candidateZoneId: 'ZC-L' }), expectClassify: true },
  { name: 'zc-08 sub-gate OB still classifies at machine level (OBCV bw/bf gates live in the adapter, not here)', machine: zoneClassificationMachine, data: D(zcBars, [zcZone({ id: 'ZC-S', bw: 1.2, bf: 0.4, bottom: 1.1405, top: 1.1408 })], { candidateZoneId: 'ZC-S' }), expectClassify: true },
  { name: 'zc-09 broken zone with battle history (brokenWithBattle)', machine: zoneClassificationMachine, data: D([
    { t: 1000, O: 1.142, H: 1.1425, L: 1.1415, C: 1.142 },
    { t: 2000, O: 1.1412, H: 1.1415, L: 1.1385, C: 1.1388 },
  ], [zcZone({ id: 'ZC-B2', pressure: 'BROKEN', reactionCount: 2 })], { candidateZoneId: 'ZC-B2' }), expectClassify: true },
  { name: 'zc-10 unknown candidate id falls back to highest-zfp zone (operativeZone, engine.ts:48-54)', machine: zoneClassificationMachine, data: D(zcBars, [zcZone({ id: 'ZC-W' })], { candidateZoneId: 'NOPE' }), expectClassify: true },
  { name: 'zc-11 no zones (no operative zone — reject)', machine: zoneClassificationMachine, data: D(zcBars, [], {}), expectClassify: false },
  { name: 'zc-12 fully empty (reject)', machine: zoneClassificationMachine, data: makeData({ bars: [], zones: [] }), expectClassify: false },
];

const ZP: Case[] = [
  { name: 'zp-01 virgin 1H BoM (B.W2.3-M4: ENTRY-PRIMARY, virginZone)', machine: zonePressureMachine, data: virginBoMFixture(), expectClassify: true },
  { name: 'zp-02 REJECT label has no lifecycle (rejectedPressure)', machine: zonePressureMachine, data: rejectedPressureFixture(), expectClassify: false },
  { name: 'zp-03 ACTIVE-1 one sweep consumed (battle-count guard)', machine: zonePressureMachine, data: D(zpBars, [zpZone({ id: 'ZP-A1', pressure: 'ACTIVE-1', reactionCount: 1 })], { candidateZoneId: 'ZP-A1' }), expectClassify: true },
  { name: 'zp-04 ACTIVE-2 two sweeps (lifecycle advance)', machine: zonePressureMachine, data: D(zpBars, [zpZone({ id: 'ZP-A2', pressure: 'ACTIVE-2', reactionCount: 2 })], { candidateZoneId: 'ZP-A2' }), expectClassify: true },
  { name: 'zp-05 DEPLETED three sweeps (the 3rd-sweep death rule)', machine: zonePressureMachine, data: D(zpBars, [zpZone({ id: 'ZP-D', pressure: 'DEPLETED', reactionCount: 3 })], { candidateZoneId: 'ZP-D' }), expectClassify: true },
  { name: 'zp-06 FORTRESS five defenses (the operator flip law 4+)', machine: zonePressureMachine, data: D(zpBars, [zpZone({ id: 'ZP-F', pressure: 'FORTRESS', reactionCount: 5 })], { candidateZoneId: 'ZP-F' }), expectClassify: true },
  { name: 'zp-07 BROKEN body-close-through (role reversal)', machine: zonePressureMachine, data: D(zpBars, [zpZone({ id: 'ZP-B', pressure: 'BROKEN', reactionCount: 2 })], { candidateZoneId: 'ZP-B' }), expectClassify: true },
  { name: 'zp-08 4H virgin MoM out of death scope (fourHVirginMoM descriptive, use empty — reject)', machine: zonePressureMachine, data: D(zpBars, [zpZone({ id: 'ZP-4H', tf: '4H', classification: 'MoM' })], { candidateZoneId: 'ZP-4H' }), expectClassify: false },
  { name: 'zp-09 30m virgin MoM in death scope (deathRuleScope suggestive)', machine: zonePressureMachine, data: D(zpBars, [zpZone({ id: 'ZP-30', tf: '30m', classification: 'MoM' })], { candidateZoneId: 'ZP-30' }), expectClassify: true },
  { name: 'zp-10 MoM ACTIVE-1 contested (momType descriptive vs pressure FOR)', machine: zonePressureMachine, data: D(zpBars, [zpZone({ id: 'ZP-MA', classification: 'MoM', pressure: 'ACTIVE-1', reactionCount: 1 })], { candidateZoneId: 'ZP-MA' }), expectClassify: true },
  { name: 'zp-11 no zones (reject)', machine: zonePressureMachine, data: D(zpBars, [], {}), expectClassify: false },
  { name: 'zp-12 fully empty (reject)', machine: zonePressureMachine, data: makeData({ bars: [], zones: [] }), expectClassify: false },
];

const SC: Case[] = [
  { name: 'sc-01 SS→BS marubozu + zfp 0.55 (B.W2.3-M5 ssToBs guard)', machine: shapeChainMachine, data: ssToBsFixture(), expectClassify: true },
  { name: 'sc-02 empty chain, no zones (no step FOR fires)', machine: shapeChainMachine, data: emptyChainFixture(), expectClassify: false },
  { name: 'sc-03 BS→R retrace bar (bsTargetRetrace)', machine: shapeChainMachine, data: sc([{ t: 5000, O: 1.144, H: 1.1442, L: 1.1425, C: 1.1428 }], ['BS'], 'R'), expectClassify: true },
  { name: 'sc-04 WL→SS consolidation (immediateConsolidation)', machine: shapeChainMachine, data: sc(ssBars, ['WL'], 'SS'), expectClassify: true },
  { name: 'sc-05 R→WL thrust (marubozuBreakout continuation)', machine: shapeChainMachine, data: sc([{ t: 5000, O: 1.1402, H: 1.1428, L: 1.14, C: 1.1426 }], ['R'], 'WL'), expectClassify: true },
  { name: 'sc-06 low-zfp SS still steps (exhaustionPinBar path — documents zfp-guard sensitivity)', machine: shapeChainMachine, data: makeData({ bars: ssBars, zones: [{ ...CHAIN_ZONE, zfp: 0.1 }], shapeChain: ['SS'], meta: { candidateZoneId: 'CH-1', currentShape: 'BS', tf: '1H' } }), expectClassify: true },
  { name: 'sc-07 macro-context present, chain steps anyway (unifiedMacroAuthority use-exemptor)', machine: shapeChainMachine, data: makeData({ bars: [{ t: 5000, O: 1.14, H: 1.1408, L: 1.14, C: 1.1408 }], zones: [CHAIN_ZONE], shapeChain: ['SS'], e1: { macroChain: 'R' }, meta: { candidateZoneId: 'CH-1', currentShape: 'BS', tf: '1H' } }), expectClassify: true },
  { name: 'sc-08 bars but no zones (marubozu anatomy alone suffices)', machine: shapeChainMachine, data: makeData({ bars: defendBars, zones: [], shapeChain: [], meta: { tf: '1H' } }), expectClassify: true },
  { name: 'sc-09 fully empty (no anatomy — reject)', machine: shapeChainMachine, data: makeData({ bars: [], zones: [] }), expectClassify: false },
  { name: 'sc-10 RWL→BS continuation (reverse continuation guard)', machine: shapeChainMachine, data: sc([{ t: 5000, O: 1.1397, H: 1.142, L: 1.1395, C: 1.1418 }], ['RWL'], 'BS'), expectClassify: true },
  { name: 'sc-11 WLS→SS resolution (the NY-session-decides path)', machine: shapeChainMachine, data: sc([
    { t: 4000, O: 1.141, H: 1.1418, L: 1.1398, C: 1.1415 },
    { t: 5000, O: 1.1415, H: 1.142, L: 1.141, C: 1.1418 },
  ], ['WLS'], 'SS'), expectClassify: true },
  { name: 'sc-12 SS→SS no transition (same-shape: no step FOR fires — reject)', machine: shapeChainMachine, data: sc([{ t: 5000, O: 1.14, H: 1.14013, L: 1.13988, C: 1.14005 }], ['SS'], 'SS'), expectClassify: false },
];

const OT: Case[] = [
  { name: 'ot-01 obvious long composite (B.W2.3-M6: aggregate pos>neg)', machine: obviousTradesMachine, data: obviousLongFixture(), expectClassify: true },
  { name: 'ot-02 fully empty (no projection FOR — reject)', machine: obviousTradesMachine, data: emptyTradesFixture(), expectClassify: false },
  { name: 'ot-03 missing e3 setups (composite survives on E1+E2 — documents leniency)', machine: obviousTradesMachine, data: ot({ e3: {} }), expectClassify: true },
  { name: 'ot-04 zones present but e1 references cleared (stale-map leniency)', machine: obviousTradesMachine, data: ot({ zones: [], e1: {} }), expectClassify: true },
  { name: 'ot-05 short-side supply composite (direction-symmetric gate)', machine: obviousTradesMachine, data: ot({ zones: [{ ...OT_BASE.zones[0], id: 'Z-S', type: 'SUPPLY', top: 1.145, bottom: 1.144 }], e1: { zoneIds: ['Z-S'], direction: 'SHORT' }, meta: { candidateZoneId: 'Z-S', spot: 1.143 } }), expectClassify: true },
  { name: 'ot-06 fortress zone composite (strong readings push neg above pos — reject)', machine: obviousTradesMachine, data: ot({ zones: [{ ...OT_BASE.zones[0], pressure: 'FORTRESS', reactionCount: 5 }] }), expectClassify: false },
  { name: 'ot-07 no zones at all (reject)', machine: obviousTradesMachine, data: makeData({ bars: defendBars, zones: [] }), expectClassify: false },
  { name: 'ot-08 missing e2 projection (survives on E1+e3)', machine: obviousTradesMachine, data: ot({ e2: {} }), expectClassify: true },
  { name: 'ot-09 empty shape chain (survives on zone+anchor evidence)', machine: obviousTradesMachine, data: ot({ shapeChain: [] }), expectClassify: true },
  { name: 'ot-10 depleted-zone composite (exhaustion priced — still projects)', machine: obviousTradesMachine, data: ot({ zones: [{ ...OT_BASE.zones[0], pressure: 'DEPLETED', reactionCount: 3 }] }), expectClassify: true },
  { name: 'ot-11 virgin-zone composite (untested zone: no projection — reject)', machine: obviousTradesMachine, data: ot({ zones: [{ id: 'Z-1', type: 'DEMAND', top: 1.14145, bottom: 1.14, classification: 'BoM', formationMs: 3000, originIdx: 2, bw: 3.5, bf: 0.7, prior: 'NONE', tf: '1H', zfp: 0.5, pressure: 'VIRGIN', reactionCount: 0 }] }), expectClassify: false },
  { name: 'ot-12 zones+chain but all E-signals cleared (no E1/E2/E3 confluence — no projection, reject)', machine: obviousTradesMachine, data: makeData({ bars: OT_BASE.bars, zones: OT_BASE.zones, shapeChain: ['SS', 'BS'], meta: { candidateZoneId: 'Z-1', spot: 1.142 } }), expectClassify: false },
];

const ALL: Case[] = [...CP, ...CS, ...ZC, ...ZP, ...SC, ...OT];

for (const c of ALL) {
  test(c.name, () => {
    let res;
    try {
      res = c.machine.classify({ data: c.data });
    } catch (e) {
      throw new Error(`${c.name}: classify threw: ${(e as Error).message}`);
    }
    expect(res.confidence).toBeGreaterThanOrEqual(0);
    expect(res.confidence).toBeLessThanOrEqual(1);
    expect(c.expectClassify ? res.action === 'classify' : res.action !== 'classify').toBe(true);
  });
}

test('battery size is 72 (12 x 6)', () => {
  expect(ALL.length).toBe(72);
  expect(CP.length).toBe(12); expect(CS.length).toBe(12); expect(ZC.length).toBe(12);
  expect(ZP.length).toBe(12); expect(SC.length).toBe(12); expect(OT.length).toBe(12);
});
