// Plutus V5 E1 — src/e1/index.ts — the E1 knowledge-core re-export surface.
// The core (types + engine, verbatim port) + the 6-machine registry.
export * from './core/types';
export {
  LexiconRegistry,
  SMC_LARGE_OB_RATIO,
  DEATH_SCOPE_TFS,
  ESCALATION_THRESHOLD,
  VOTE_WINDOW_HOURS,
  operativeZone,
  zoneWidth,
  bucket,
  windowBars,
  approachSide,
  candlesTouching,
  reactionCount,
  largeOb,
  scoreSignals,
  confidence,
  classify,
  classifyAggregate,
  buildBlock,
  buildRefineWarning,
  sessionState,
} from './core/engine';
export type { SessionState } from './core/engine';
export {
  DEFAULT_MACHINES,
  LEXICON_NAMES,
  candlePressureMachine,
  candleShapeMachine,
  zoneClassificationMachine,
  zonePressureMachine,
  shapeChainMachine,
  obviousTradesMachine,
} from './machines/index';
export { CANDLE_PRESSURE_FAMILIES } from './machines/candle-pressure';
export { CANDLE_SHAPE_FAMILIES } from './machines/candle-shape';
export { ZONE_CLASSIFICATION_FAMILIES } from './machines/zone-classification';
export { ZONE_PRESSURE_FAMILIES } from './machines/zone-pressure';
export { SHAPE_CHAIN_FAMILIES } from './machines/shape-chain';
export { OBVIOUS_TRADES_FAMILIES } from './machines/obvious-trades';
