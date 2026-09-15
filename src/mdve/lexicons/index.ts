/**
 * index.ts — THE SIX-LEXICON REGISTRY (the semantic intent layer).
 *
 * Every lexicon registers as an IntelligenceLexicon machine (TradingLexiconRule)
 * with its families + the two-phase enforcement. The registry is the single
 * import surface for the consumers (lmv.ts · shape-brain.ts · mirror.ts).
 *
 * THE WIRING MAP (the spec §5.1 — who consumes what):
 *   LEXICON 1 candle-pressure   ──► the LMV side vote (lmv.ts:618-645)
 *   LEXICON 2 candle-shape      ──► the E2 per-day classification (shape-brain)
 *   LEXICON 3 zone-classification ─► the E2 death-rule exemption (shape-brain:1150)
 *   LEXICON 4 zone-pressure     ──► the E2 designation + the E3 SL-relevance
 *   LEXICON 5 shape-chain       ──► the E2 chain + the unified macro authority
 *   LEXICON 6 obvious-trades    ──► the STEP-B token baseline (registered + unit-
 *                                   tested this wave; the reasoning-chain wiring
 *                                   is the W5-W7 wave's file)
 */
import { candlePressureLexicon } from './candle-pressure.js';
import { candleShapeLexicon } from './candle-shape.js';
import { zoneClassificationLexicon } from './zone-classification.js';
import { zonePressureLexicon } from './zone-pressure.js';
import { shapeChainLexicon } from './shape-chain.js';
import { obviousTradesLexicon } from './obvious-trades.js';
import type { TradingLexiconRule } from './types.js';

export { candlePressureLexicon } from './candle-pressure.js';
export { candleShapeLexicon } from './candle-shape.js';
export { zoneClassificationLexicon, isPhantomBoM } from './zone-classification.js';
export { zonePressureLexicon, pressureScoreOf } from './zone-pressure.js';
export { shapeChainLexicon, unifiedMacroShape } from './shape-chain.js';
export { obviousTradesLexicon, RRR_GATE } from './obvious-trades.js';
export { candleSideVote } from './candle-pressure.js';
export type {
  LexiconData,
  LexiconResult,
  LexiconAction,
  LexiconGroup,
  LexiconId,
  Predicate,
  TradingLexiconRule,
  TradingPatternFamily,
} from './types.js';
export { classifyByFamilies, confidenceOf, scoreFamily, EVIDENCE_WEIGHT } from './types.js';

/** The six registered lexicons — the closed registry (the spec §5.1). */
export const LEXICONS: readonly TradingLexiconRule[] = [
  candlePressureLexicon,
  candleShapeLexicon,
  zoneClassificationLexicon,
  zonePressureLexicon,
  shapeChainLexicon,
  obviousTradesLexicon,
];

/** The registry by id — the consumers look up the machine by its id. */
export const LEXICON_BY_ID: ReadonlyMap<string, TradingLexiconRule> = new Map(
  LEXICONS.map((l) => [l.id, l]),
);
