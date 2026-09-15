// OHLC-Intelligence-Lexicon-v1.0 — src/core/types.ts
// The shared type contracts for every trading lexicon machine in the registry.
//
// THE ADAPTATION (Task 1): the IntelligenceLexicon-Edition-v1.0's PatternFamily
// signals were RegExp[] (text triggers). In this fork the signals become
// Predicate[] — deterministic functions over the OHLC/zone data (the MPSE law:
// "every predicate is a deterministic expression (a numeric comparison / a set
// membership / a piecewise branch) — fuzzy prose is the derailment").
// The machine FORM (MachineRule / PatternFamily / ClassifierInput / ClassifierResult)
// is byte-identical to the source — only the signal type changes, plus the
// trading data contracts (LexiconData / OHLCBar / ZoneModel / LqzZoneMatrix).
//
// Design authority: MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md (the machine form,
// lines 7-31). Doctrine: the operator's mapping law — "zones/candles = regex ·
// pressure mechanics = semantic intent · shape chains = semantically intelligent
// algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups
// = tool outputs".

export type PatternGroup =
  | 'candle-predicate'      // the per-candle battle/shape predicates (Lexicon 1+2)
  | 'zone-predicate'        // the zone identity/pressure predicates (Lexicon 3+4)
  | 'chain-predicate'       // the shape-chain/macro predicates (Lexicon 5)
  | 'projection-predicate'; // the forward-reasoning/projection predicates (Lexicon 6 + the chain)

// ── the trading data contracts (the LMV/OBCV foundation — NEVER re-derived) ──

export interface OHLCBar {
  t: number;  // timestamp ms
  O: number;  // open
  H: number;  // high
  L: number;  // low
  C: number;  // close
}

export type ZoneClassification = 'BoM' | 'MoM' | 'IP' | 'LSZ' | 'PHANTOM_BOM' | 'REJECT';
export type PressureState = 'VIRGIN' | 'ACTIVE-1' | 'ACTIVE-2' | 'DEPLETED' | 'FORTRESS' | 'BROKEN';
export type TouchKind = 'SWEEP' | 'WICK_REJECT' | 'BODY_DEFEND' | 'CONSOL_DWELL' | 'PASS_THROUGH';
export type ShapeCode = 'SS' | 'BS' | 'R' | 'WL' | 'RWL' | 'WLS' | 'PBS';
export type Direction = 'LONG' | 'SHORT';
export type PairKey = 'DXY' | 'EUR/USD' | 'GBP/USD';
export type TimeframeKey = '1H' | '4H' | '30m' | '15m';

export interface ZoneModel {
  id: string;
  type: 'DEMAND' | 'SUPPLY';
  top: number;        // the zone's ceiling
  bottom: number;     // the zone's floor
  classification: ZoneClassification;
  formationMs: number;
  originIdx: number;
  bw: number;         // the OBCV body-width gate (bw >= 3.0)
  bf: number;         // the OBCV body-fraction gate (bf >= 0.65)
  prior: 'NONE' | 'OPPOSITE' | 'SAME';   // the prior-move classifier output
  parent?: string;    // the containing 4H structure id (the macro-origin element / KCE-Telescoping)
  tf?: TimeframeKey;  // the zone's timeframe (the death-rule scope)
  source?: string;    // the 9-pillar confluence source (IP family: 'PILLAR')
  zfp: number;        // 0..1 — the zone-fill probability
  pressure?: PressureState;   // the zone-pressure lifecycle state (Lexicon 4)
  reactionCount?: number;     // the mitigation/battle count (the SWEEP consumption events)
}

export interface LqzZoneMatrix {
  table: Array<Record<string, unknown>>;   // the LMV rung table (token 3 — the liquidity read)
}

export interface Rung {
  id: string;
  zoneId: string;      // the containing S/D zone id (the structure law: resting-side)
  floor: number;
  ceiling: number;
  type: 'DEMAND' | 'SUPPLY';
}

/** The union of the pipeline's data contracts the lexicons read. */
export interface LexiconData {
  bars: OHLCBar[];
  zones: ZoneModel[];
  rungs: Rung[];
  shapeChain: ShapeCode[];       // the prior days' shapes (the E2 decomposition)
  lqzMatrix: LqzZoneMatrix;
  e1: Record<string, unknown>;   // the E1 zone map outputs
  e2: Record<string, unknown>;   // the E2 shape-chain / storyline outputs
  e3?: Record<string, unknown>;  // the E3 setup outputs (the obvious-trades validation confluence — E1+E2+E3 agree)
  meta: {
    pair: PairKey;
    week: string;
    anchorMs: number;            // the temporal gate — the chain reads bars only up to ANCHOR_MS
    atr14: number;
    pip: number;                 // DXY_PIP = 0.01; EU/GU PIP = 0.0001 (the trading-constants lineage)
    spot: number;                // the price's current position
    currentShape?: ShapeCode;    // the current day's shape (Lexicon 5 input)
    tf?: TimeframeKey;           // the current analysis context TF (the tf-hierarchy family)
    candidateZoneId?: string;    // the zone under evaluation (the E1 pick / the E2 operative)
  };
}

/** The MPSE deterministic predicate — (data) => boolean over the OHLC/zone data. */
export type Predicate = (data: LexiconData) => boolean;

// ── the PatternFamily (the trading form) ──────────────────────────────────────

export interface PatternFamily {
  group: PatternGroup;
  /** the EVIDENCE AGAINST the semantic intent — weight +1 */
  descriptive: Predicate[];
  /** the EVIDENCE FOR the semantic intent — weight +1 */
  suggestive: Predicate[];
  /** the MISLEADING SURFACE patterns (the "regex without the psychology") — weight +2 */
  substitute?: Predicate[];
  /** the LEGITIMATE EXEMPTORS (the short-circuit — the classification is REAL) — weight +3 */
  use?: Predicate[];
}

// ── the classifier I/O ────────────────────────────────────────────────────────

export interface ClassifierInput {
  text?: string;                 // the source form (kept for compatibility)
  data?: LexiconData;            // the trading form — the OHLC/zone data the predicates read
  tool?: string;
  args?: Record<string, unknown>;
  sessionID?: string;
}

export interface ClassifierResult {
  intent: string;                // e.g. 'phantom_bom' | 'defend' | 'flagged' | 'none'
  confidence: number;            // pos/(pos+neg+1) — 0..1
  action: 'allow' | 'block' | 'warn' | 'chain' | 'classify' | 'reject' | 'escalate';
  matchedFamilies: string[];     // the PatternFamily groups that fired
  evidence: string;              // the matched predicate name (never narration)
  refinements?: number;          // the refinement counter (the two-phase enforcement)
  sessionID?: string;
}

export interface ChainDirective {
  tool: string;
  context: string;
  critical?: boolean;
}

export interface PreVerdict {
  allow: boolean;
  args?: Record<string, unknown>;
  chain?: ChainDirective;
  blockMsg?: string;
}

export interface PostVerdict {
  allow: boolean;
  output?: string;
  triage?: string;
}

export interface ToolFirewall {
  pre(args: Record<string, unknown>, ctx: { sessionID?: string }): PreVerdict;
  post(result: unknown, ctx: { sessionID?: string; args: Record<string, unknown> }): PostVerdict;
}

export interface MachineRule {
  id: string;
  families: PatternFamily[];
  classify(input: ClassifierInput): ClassifierResult;
  enforce(result: ClassifierResult, phase: 'A' | 'B'): void;
  // Phase A = the E1/E2/E3 boundary (a hard violation — the refine/retry warning, hard-throw after 3)
  // Phase B = the OUTPUT MUTATION (the classification demand appended to the pipeline stage's output)
  escapeHatchTool: string;          // the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: number;      // 3 — three rejected classifications → the problem-solving dispatch
}

export interface StructuredLexiconBlockError extends Error {
  machine: string;
  detected: string;
  correction: string;
  evidenceRequired: boolean;
  phase: 'A' | 'B';
  refinements?: number;      // the refinement counter at the throw (the refine/retry doctrine)
}
