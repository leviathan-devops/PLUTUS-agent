// Plutus V5 E1 — src/e1/machines/index.ts (ported from OHLC-Intelligence-Lexicon-v1.0 verbatim)
// DEFAULT_MACHINES registry — the SIX trading lexicon machines registered as MachineRules.
// Copy-and-customize (the fork's customization path): add YOUR machine here + register
// it in the LexiconRegistry (the README §customization).
import type { MachineRule } from '../core/types';
import { candlePressureMachine } from './candle-pressure';
import { candleShapeMachine } from './candle-shape';
import { zoneClassificationMachine } from './zone-classification';
import { zonePressureMachine } from './zone-pressure';
import { shapeChainMachine } from './shape-chain';
import { obviousTradesMachine } from './obvious-trades';

export { candlePressureMachine, candleShapeMachine, zoneClassificationMachine, zonePressureMachine, shapeChainMachine, obviousTradesMachine };

export const DEFAULT_MACHINES: MachineRule[] = [
  candlePressureMachine,     // Lexicon 1 — the per-candle battle semantics (defend/reject/sweep/dwell)
  candleShapeMachine,        // Lexicon 2 — the per-candle shape signatures (SS/BS/R/WL/RWL/WLS)
  zoneClassificationMachine, // Lexicon 3 — the BoM/MoM identity + THE PHANTOM BoM (the fortress)
  zonePressureMachine,       // Lexicon 4 — the zone-pressure lifecycle + the fortress + the death-rule scope
  shapeChainMachine,         // Lexicon 5 — the fractal chains + the unified macro authority
  obviousTradesMachine,      // Lexicon 6 — the forward-reasoning tokens (the missing layer)
];

/** The six lexicons' names — the reasoning chain's token 1-7 read these. */
export const LEXICON_NAMES = ['candle-pressure', 'candle-shape', 'zone-classification', 'zone-pressure', 'shape-chain', 'obvious-trades'] as const;
