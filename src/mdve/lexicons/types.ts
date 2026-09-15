/**
 * types.ts — THE SIX-LEXICON MACHINE FORM (the IntelligenceLexicon machine).
 * (PLUTUS_V4.5.4_LEXICON_SPEC.md §"THE MACHINE FORM" — the design authority,
 * implemented verbatim: TradingLexiconRule / TradingPatternFamily / Predicate /
 * the pos/(pos+neg+1) scoring / the pos>neg decision / the two-phase enforce.)
 *
 * THE OPERATOR'S LAW (verbatim — the layer this module sits in):
 *   "zones/candles = regex · pressure mechanics = semantic intent · shape
 *    chains = semantically intelligent algorithmic systems · E1/E2/E3
 *    pipeline = Trident deep planning L2 · trade setups = tool outputs"
 * The lexicons ARE the SEMANTIC INTENT layer between the mechanical detection
 * (the regex/LMV/OBCV) and the algorithmic systems (the shape chains).
 *
 * THE MPSE LAWS (enforced structurally):
 *   - every predicate is a DETERMINISTIC function over the OHLC/zone data —
 *     a numeric comparison / a set membership / a piecewise branch. Fuzzy
 *     prose is the derailment (the Losslessness Theorem). No predicate may
 *     call Math.random, read a clock, or consult external state.
 *   - the confidence = pos/(pos+neg+1) — never a magic number, always the
 *     count ratio with the +1 Laplace floor.
 *   - the decision = pos > neg ? 'classify' : 'reject' — fail-closed: the
 *     reject is the conservative default, never the classify.
 *   - the escalation = 3 rejected classifications → the problem-solving
 *     dispatch (the escalationThreshold contract).
 *
 * THE ENFORCEMENT (the two-phase machine):
 *   - Phase A = the E1/E2/E3 boundary THROW (a hard violation — the phantom-
 *     BoM reversal, the macro divergence, a DEPLETED zone as the entry-
 *     primary). A Phase-A violation is a LOUD FAIL that NAMES the rule.
 *   - Phase B = the OUTPUT MUTATION (the classification demand appended to
 *     the pipeline stage's output — the audit trail, never a silent pass).
 *   - escapeHatchTool = the pipeline's re-run / the audit tool (never blocked)
 *     — the escape hatch the operator's legit setups always ride.
 */

/** The six lexicon ids — the closed set the whole module registers. */
export type LexiconId =
  | 'candle-pressure'
  | 'candle-shape'
  | 'zone-classification'
  | 'zone-pressure'
  | 'shape-chain'
  | 'obvious-trades';

/** The predicate groups — the family taxonomy (the spec §"THE MACHINE FORM"). */
export type LexiconGroup =
  | 'candle-predicate'
  | 'zone-predicate'
  | 'chain-predicate'
  | 'projection-predicate';

/** The classification action — the decision the scoring produces. */
export type LexiconAction = 'classify' | 'reject' | 'escalate';

/**
 * The raw OHLC / zone datum a predicate reads. EVERY field is optional — a
 * predicate reads ONLY the fields its family needs; the absent fields are the
 * honest absence (never a fabricated value, never a proxy — §12 Law 3).
 */
export interface LexiconData {
  // ── the candle context (the candle-pressure + candle-shape lexicons) ──
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  timestamp?: number;
  /** the CANONICAL touch kind (the classifyTouch piecewise-TOTAL output — the
   *  LMV's reaction extraction, lqz-matrix.ts:196-241). When present it IS the
   *  authoritative intent (the candle-pressure lexicon's canonical decision —
   *  byte-identical to the LMV by construction); the family predicates then
   *  supply the semantic confidence + the evidence record. */
  touchKind?: 'SWEEP' | 'WICK_REJECT' | 'BODY_DEFEND' | 'CONSOL_DWELL' | 'PASS_THROUGH';
  /** the widened bucket [lo−ε, hi+ε] the candle interacts with. */
  lo?: number;
  hi?: number;
  /** the ATR14 (the revMin = max(2p, 0.5×ATR) anchor). */
  atr?: number;
  /** the pip value (the 2-pip min-depth anchor). */
  pipValue?: number;
  /** the reference close (the previous bar's close — the approach side). */
  refClose?: number;
  /** the previous bar (the BODY_DEFEND next-bar predicate). */
  prev?: { open?: number; high?: number; low?: number; close?: number; timestamp?: number };
  /** the next bar (the BODY_DEFEND / reject predicates). */
  next?: { open?: number; high?: number; low?: number; close?: number; timestamp?: number };
  /** the preceding bars window (the 3-day window — the dwell + the shape). */
  bars?: Array<{ open: number; high: number; low: number; close: number; timestamp: number }>;
  /** the approach direction (fromAbove / fromBelow / dwell — the side vote). */
  approach?: 'fromAbove' | 'fromBelow' | 'dwell';
  /** the candle index in the window (the consecutive-bars dwell predicate). */
  index?: number;
  /** the ATR-based bucket width in price units (the dwell span ceiling). */
  bucketWidth?: number;

  // ── the anatomy tokens (the candle-shape lexicon — the L2-spec:861-864) ──
  bodyFraction?: number;      // bf — the body size / total range
  bodyToWick?: number;        // the body-to-wick ratio
  wickRatio?: number;         // the wick fraction of the total range
  totalRangeRatio?: number;   // the total range vs the context range
  colorConsistency?: number;  // the alternating-color measure (0-1)
  candleProgression?: number; // the small→massive progression measure
  retracementSize?: number;   // the retracement depth fraction
  candleCount?: number;       // the candles in the day's window

  // ── the zone context (the zone-classification + zone-pressure lexicons) ──
  zoneId?: string;
  zoneType?: 'SUPPLY' | 'DEMAND';
  zoneFloor?: number;
  zoneCeiling?: number;
  zoneTimeframe?: '4H' | '1H' | '30m' | '15m';
  zoneClassification?: 'BoM' | 'MoM' | 'LQZ';
  zoneFormationMs?: number;
  zoneZfp?: number;
  zoneConfluence?: number;
  /** the zone's formation position within the current swing leg (0-1). */
  midSwingPosition?: number;
  /** the prior-move classifier output (the zone-classification lexicon). */
  priorMove?: 'NONE' | 'OPPOSITE' | 'SAME';
  /** the width-gate verdict (obcv.ts:597-610). */
  widthGate?: boolean;
  /** the OB band width in pips (the large-OB predicate). */
  widthPips?: number;
  /** the SMC ratio anchor — the ATR proxy in pips. */
  atrPips?: number;
  /** the OB band fraction (bf). */
  bandFraction?: number;
  /** the S/D width gate (the bw ≥ 3.0 predicate). */
  bw?: number;
  /** the zone's reaction events / counts (the lifecycle inputs). */
  reactionCount?: number;
  mitigationCount?: number;
  /** the freshness state (the FRESH/TESTED/DEPLETED machine). */
  freshness?: 'FRESH' | 'TESTED_1X' | 'TESTED_2X' | 'DEPLETED' | 'VIOLATED';
  /** the pierce-with-battle flag (the broken predicate). */
  pierced?: boolean;
  /** the strong-hold count (the fortress predicate — the 4+ strong holds). */
  strongHoldCount?: number;
  /** the source-zone parent id (the macro-origin continuation predicate). */
  parentZoneId?: string;
  nestedWithin?: boolean;
  /** the OTHER zones in the model (the zone-classification lexicon's
   *  pre-formation opposing-BoM reaction + macro-origin continuation scan —
   *  the model.zones equivalent of phantomBoMExemption). */
  zones?: Array<{
    type?: 'SUPPLY' | 'DEMAND';
    classification?: 'BoM' | 'MoM';
    formationMs?: number;
    top?: number;
    bottom?: number;
    timeframe?: string;
  }>;
  /** the opposing-zone metadata (the pre-formation opposing-BoM reaction). */
  opposingZone?: {
    type?: 'SUPPLY' | 'DEMAND';
    classification?: 'BoM' | 'MoM';
    formationMs?: number;
    top?: number;
    bottom?: number;
  } | null;
  /** the macro-origin element (the containing 4H structure). */
  macroOrigin?: {
    timeframe?: string;
    type?: 'SUPPLY' | 'DEMAND';
    bottom?: number;
    top?: number;
  } | null;
  /** the opposing-zone pre-formation reaction flag. */
  opposingBoMReaction?: boolean;
  /** the large-OB width flag. */
  largeOb?: boolean;
  /** the mid-swing-recovery + fakeout flag. */
  midSwingFakeout?: boolean;
  /** the macro-origin continuation flag. */
  macroOriginContinuation?: boolean;

  // ── the lifecycle context (the zone-pressure lexicon) ──
  lifecycle?: string;         // VIRGIN / ACTIVE_1 / ACTIVE_2 / DEPLETED / FORTRESS / BROKEN
  /** the reaction events (the SWEEP consumption events). */
  reactionEvents?: Array<{ pierced?: boolean }>;
  absorption?: 'INTACT' | 'ABSORBED';
  /** the 4H/1H/30m hierarchy read. */
  timeframe?: '4H' | '1H' | '30m' | '15m';

  // ── the chain context (the shape-chain lexicon) ──
  currentShape?: string;
  /** the ZFP-conditioned next shape (shape-brain.ts:874-888). */
  zfpNextShape?: string | null;
  /** the per-pair day shape (the divergence vs the macro authority). */
  perPairShape?: string;
  /** the macro-authority day shape (the DXY's chain for the EU, the EU
   *  core's for the GU — the unified macro authority). */
  macroShape?: string;
  /** the documented per-pair mechanic (the divergence exemption). */
  perPairMechanic?: string | null;
  /** the ZFP-conditioned bounding zone read (the >45% / <30% gates). */
  boundingZoneZfp?: number;
  /** the marubozu breakout body ratio (3-5× the SS body). */
  breakoutBodyRatio?: number;
  /** the target-retrace band fraction (20-40% → R, <20% → RWL). */
  targetRetrace?: number;
  /** the long-wick liquidity grab flag (the r-to-wl predicate). */
  liquidityGrab?: boolean;

  // ── the projection context (the obvious-trades lexicon) ──
  pair?: string;
  day?: string;
  direction?: 'LONG' | 'SHORT';
  /** the trade-chaining state — the TP of N = the entry of N+1 (Law 27). */
  chainingTp?: number;
  /** the entry / SL / TP anchors (the checkable numbers). */
  E?: number;
  SL?: number;
  TP?: number;
  /** the E1 zone + the E2 projection traces (the E3-NEVER rule). */
  e1ZoneId?: string;
  e2ProjectionId?: string;
  /** the price's CURRENT position relative to the designation. */
  currentPrice?: number;
  /** the N-pips-from-zone predicate (the forward-position). */
  designatedLevel?: number;
  /** the opposing impulse strengths (the strength-comparison). */
  buyImpulse?: number;
  sellImpulse?: number;
  /** the zone's reaction state (the forward-position exemptor). */
  zoneLifecycle?: string;
  /** the RRR gate (the anchor-construction consequence). */
  rrr?: number;
  /** the macro storyline confluence alignment (the validation). */
  confluenceAligned?: boolean;
  /** the E1 pressure break-validation (the validation exemptor). */
  breakValidated?: boolean;
  /** the per-layer divergence flags (the validation descriptive). */
  layerDivergence?: string[] | null;
  /** the reaction-count state (the third-mitigation / fortress math). */
  reactionCountState?: number;
  /** the PHANTOM_BOM flag (the fortress — the strongest exemptor). */
  phantomBom?: boolean;
}

/** The predicate — a deterministic function over the OHLC/zone data. */
export type Predicate = (data: LexiconData) => boolean;

/**
 * The TradingPatternFamily — the semantic evidence group.
 *   suggestive  = the EVIDENCE FOR the intent (pos weight +1, some +2)
 *   descriptive = the EVIDENCE AGAINST the intent (neg weight +1)
 *   substitute  = the MISLEADING SURFACE patterns (pos +2 — the "regex
 *                 without the psychology" — the derailment the family kills)
 *   use         = the LEGITIMATE EXEMPTORS (neg +3 — the classification is
 *                 REAL — the short-circuit)
 */
export interface TradingPatternFamily {
  /** the family's machine id (unique within the lexicon). */
  id: string;
  group: LexiconGroup;
  descriptive: Predicate[];
  suggestive: Predicate[];
  substitute?: Predicate[];
  use?: Predicate[];
}

/** The classification result — {intent, confidence, action} + the MPSE record. */
export interface LexiconResult {
  /** the winning semantic intent (the family's intent). */
  intent: string;
  /** pos/(pos+neg+1) — the Laplace-floored evidence ratio, never a magic number. */
  confidence: number;
  /** the decision: pos > neg ? 'classify' : 'reject'. */
  action: LexiconAction;
  /** the raw evidence counts (the MPSE transparency). */
  pos: number;
  neg: number;
  /** the per-family scores (the decision trace). */
  scores: Record<string, number>;
  /** the evidence lines (the per-predicate hits — file:line-free, data-bound). */
  evidence: string[];
  /** the escape hatch — the pipeline's re-run / the audit tool. */
  escapeHatchTool?: string;
  /** the Phase-B OUTPUT MUTATION — the classification demand the consumer
   *  appends to the pipeline stage's output (the audit trail). Filled by
   *  enforce(result, 'B'); absent until then (never a fabricated demand). */
  demand?: string;
  /** the Phase-A HARD-VIOLATION marker — set by classify when the classification
   *  itself proves the boundary contract is broken (e.g. the candle-shape BS-vs-
   *  PBS divergence, the zone-pressure DEPLETED-as-entry-primary). enforce(result,
   *  'A') THROWS on a present violation — a LOUD FAIL that NAMES the rule. */
  violation?: string;
}

/**
 * The TradingLexiconRule — the machine every lexicon registers.
 * The design authority's contract (implemented verbatim):
 *   classify(input) → {intent, confidence, action}
 *   enforce(result, phase 'A'|'B') — A = the boundary THROW, B = the mutation.
 */
export interface TradingLexiconRule {
  id: LexiconId;
  families: TradingPatternFamily[];
  classify(input: LexiconData): LexiconResult;
  enforce(result: LexiconResult, phase: 'A' | 'B'): void;
  escapeHatchTool: string;
  escalationThreshold: number; // 3 — three rejected classifications → dispatch
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE MECHANICAL SCORING (the MPSE math — the shared reducer every lexicon uses)
// ═══════════════════════════════════════════════════════════════════════════════

/** The evidence weight the families assign (the spec's machine-form contract). */
export const EVIDENCE_WEIGHT = {
  suggestive: 1,  // pos +1 (some families override to +2 — the substitute)
  descriptive: 1, // neg +1
  substitute: 2,  // pos +2 — the surface trap (the "regex without the psychology")
  use: 3,         // neg +3 — the legitimate exemptor (the classification is REAL)
} as const;

/**
 * Score one family over the data — the deterministic evidence reducer.
 * Returns {pos, neg, score} where score = pos − neg (the decision axis).
 */
export function scoreFamily(
  family: TradingPatternFamily,
  data: LexiconData,
): { pos: number; neg: number; score: number } {
  let pos = 0;
  let neg = 0;
  for (const p of family.suggestive) if (p(data)) pos += EVIDENCE_WEIGHT.suggestive;
  for (const p of family.descriptive) if (p(data)) neg += EVIDENCE_WEIGHT.descriptive;
  if (family.substitute) for (const p of family.substitute) if (p(data)) pos += EVIDENCE_WEIGHT.substitute;
  if (family.use) for (const p of family.use) if (p(data)) neg += EVIDENCE_WEIGHT.use;
  return { pos, neg, score: pos - neg };
}

/** The confidence — pos/(pos+neg+1), the spec's Laplace-floored ratio. */
export function confidenceOf(pos: number, neg: number): number {
  return pos / (pos + neg + 1);
}

/**
 * Run the family evidence over the data and pick the winning intent.
 *   intent = the argmax family score (ties break by the family array order —
 *            the deterministic tie-break, never randomness)
 *   action = pos > neg ? 'classify' : 'reject' — the fail-closed default.
 */
export function classifyByFamilies(
  families: TradingPatternFamily[],
  data: LexiconData,
): LexiconResult {
  const scores: Record<string, number> = {};
  let best: TradingPatternFamily | null = null;
  let bestScore = -Infinity;
  let bestPos = 0;
  let bestNeg = 0;
  const evidence: string[] = [];
  for (const family of families) {
    const { pos, neg, score } = scoreFamily(family, data);
    scores[family.id] = score;
    evidence.push(`${family.id}: pos ${pos} neg ${neg} score ${score}`);
    if (score > bestScore) {
      bestScore = score;
      best = family;
      bestPos = pos;
      bestNeg = neg;
    }
  }
  if (!best) {
    // The total-failure path (never reachable: families always exist) — the
    // fail-closed reject, never a fabricated classify.
    return { intent: 'REJECT', confidence: 0, action: 'reject', pos: 0, neg: 0, scores, evidence };
  }
  return {
    intent: best.id,
    confidence: confidenceOf(bestPos, bestNeg),
    action: bestPos > bestNeg ? 'classify' : 'reject',
    pos: bestPos,
    neg: bestNeg,
    scores,
    evidence,
    escapeHatchTool: undefined,
  };
}
