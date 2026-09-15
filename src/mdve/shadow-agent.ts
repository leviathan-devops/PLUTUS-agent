/**
 * SHADOW AGENT — THE REASONING-STEP CONTRACT LAYER (the v4.5.4 refit).
 * (PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC §2.4 + the
 *  SHADOW_REWIRE_SPEC (HANDOVER_PACKAGE_4.5.4) — the D1/D7 law made mechanical:
 *  the executor RETIRED, the PRIMARY AGENT reasons in-session, visible; the
 *  contract shape preserved as the agent-facing interface.)
 *
 * THE REFIT (the operator verbatim — D1/D7):
 *   "ok shadow agent dead you are fucking this up royally replace with the
 *    actual headed agent in opencode doing the reasoning/inference in session
 *    so we can see everything" / "we are replacing all shadow agent steps with
 *    the proper primary agent so that we can accurately see what is happening.
 *    This is how it should be anyways the shadow agent was a cheat basically."
 *
 *   - The SSE fetch executor (callModel — the deepseek-v4-flash via
 *     opencode-go call + the SSE stream + the 90s idle stall detector) is
 *     RETIRED as the executor. ZERO network calls exist in the reasoning path
 *     (the CME §2.4 grep gate: fetch/axios/http = 0 in reasoning-chain.ts +
 *     shadow-agent.ts).
 *   - The infra STAYS (REFITTED, never deleted): the step wrappers
 *     (projectForward / chaining / anchor / validateProjection), the errResult
 *     validation (a failure is ENCODED, never thrown — the D2 structural
 *     requirement), the grounding contract checks (checkDirectionOrder +
 *     computeValidationFloor), the failure-store integration.
 *   - The EXECUTOR becomes the PRIMARY AGENT in-session: the machine presents
 *     the ledger + the candidates (the ReasoningStepInput contract) and
 *     VALIDATES the agent's decisions (the ReasoningStepDecisions contract)
 *     against the WARN set (W-1..W-7 — the D2 law: a violation is a WARN that
 *     CONTINUES the loop, NEVER a hard-kill on the first violation). The
 *     deterministic skeleton is ALWAYS the mechanical floor — the validity
 *     authority the agent's reasoning can refine but never override.
 *
 * THE WARN SET (the CME §2.5 — the D2 law, the machine's validation):
 *   W-1 the forwardPosition is a number
 *   W-2 the entry/sl/tp are numbers
 *   W-3 the E/SL/TP direction-order (LONG: SL < E < TP; SHORT: TP < E < SL)
 *   W-4 the chosenTarget ∈ the CLOSED continuationTargets set
 *   W-5 the e1ZoneId ∈ the E1 zone map
 *   W-6 the e2ProjectionId ∈ the E2 chain
 *   W-7 the RRR is computable (a zero/negative SL distance)
 *   → each WARN = a chain_failures row (reason GROUNDING_WARN) + the loop
 *     continues with the WARN as the refinement input → the hard-throw ONLY
 *     after 3 failed refinements (REFINEMENT_EXHAUSTED — data, never a crash).
 *
 * THE REFERENCE PATTERNS (archived — the Trident-v7.3 checkpoint 7.3, NEVER
 * invoked by the pipeline): the frozen-model concept (deepseek-v4-flash via
 * opencode-go — the operator's choice, "DO NOT USE DEEPSEEK PRO. EITHER IT
 * WORKS OR WE GET A VISIBLE LOUD ERROR") · the SSE idle-window stall detector
 * (the timer resets per chunk — a working generation NEVER dies; a TRUE stall
 * aborts) · the content||reasoning_content defensive read · the secrets chain
 * (env → the .env files → the embedded base64 — the key NEVER logged, NEVER
 * echoed). The pipeline's reasoning is the PRIMARY AGENT's own — no external
 * model call exists.
 */

import type {
  PairKey,
  ForwardProjectionInput,
  ForwardProjectionOutput,
  ChainingInput,
  ChainingOutput,
  AnchorInput,
  AnchorOutput,
  TradeProjection,
  ChainContext,
  ValidationOutput,
  RefinementWarning,
} from './reasoning-chain.js';

// ═══════════════════════════════════════════════════════════════════════════
// THE TYPES + THE RESULT CONSTRUCTORS (a ShadowResult is the ONLY return shape
// — every failure path is encoded, never thrown; the agent's malformed output
// can never crash the pipeline)
// ═══════════════════════════════════════════════════════════════════════════

export type ShadowResult<T> = { ok: true; result: T } | { ok: false; reason: string };

export function okResult<T>(result: T): ShadowResult<T> {
  return { ok: true as const, result };
}

export function errResult(reason: string): ShadowResult<never> {
  return { ok: false as const, reason };
}

/**
 * THE REASONING-STEP CONTRACT (the CME §6.2 S3 / Part 8 — the agent-facing
 * interface the reasoning chain's token 8/10/11 hooks expose): the machine
 * PRESENTS the ledger + the candidates (this input), the PRIMARY AGENT
 * reasons IN SESSION (visible in the pipeline's stream), and the machine
 * accepts + validates the agent's decisions against the WARN set.
 */
export interface ReasoningStepInput {
  /** The tokens 1-7 + 9 — the machine's deterministic core. */
  ledger: Array<{ token: string; verdict: string; confidence?: number }>;
  operativeZone: { id: string; type: 'SUPPLY' | 'DEMAND'; floor: number; ceiling: number; classification: string };
  /** The machine's candidates the agent refines. */
  candidates: {
    forwardPosition: number;
    chainedEntry: number;
    slCandidate: number | null;
    tpCandidate: number | null;
    continuationTargets: number[];
  };
  /** The unified macro signal. */
  macro: { direction: 'LONG' | 'SHORT'; source: string };
  /** The VALID zone ids (the W-5 check). */
  e1ZoneIds: string[];
  /** The VALID projection ids (the W-6 check). */
  e2ProjectionIds: string[];
}

/** The agent's DECISIONS (what it emits via the tool args — NOT the full
 *  projections; the MACHINE assembles + validates, per the A-2 audit
 *  amendment). */
export interface ReasoningStepDecisions {
  forwardPosition: number;
  chosenTarget: string;
  E: number;
  SL: number;
  TP: number;
  e1ZoneId: string;
  e2ProjectionId: string;
  confidence: number;
  rationale: string;
}

/** The L1 §6.1 shadow-agent client contract — the reasoning-step contract
 *  layer. The methods VALIDATE the agent's decisions against the WARN set;
 *  the executor is the primary agent in-session, never an external call. */
export interface ShadowAgentClient {
  projectForward(inp: ForwardProjectionInput): Promise<ShadowResult<ForwardProjectionOutput>>;
  chaining(inp: ChainingInput): Promise<ShadowResult<ChainingOutput>>;
  anchor(inp: AnchorInput): Promise<ShadowResult<AnchorOutput>>;
  validateProjection(p: TradeProjection, ledger: ChainContext): Promise<ShadowResult<ValidationOutput>>;
  readonly provider: 'opencode-go-deepseek-v4-flash';
  /** True when the contract layer is ready — the reasoning is in-session, so
   *  the contract layer is ALWAYS available (no API key gates the agent's own
   *  reasoning). */
  readonly available: boolean;
  /** The last failure reason (the honest report the diag prints). */
  lastError: string | null;
}

export interface ShadowAgentOptions {
  endpoint?: string;
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
  /** THE ADM MEASURED ENVELOPE (the W-ADM-4 firewall's input — the W-ADM-1
   *  module's measurements for the pair, passed when it lands). Absent → the
   *  validator fires only on the geometry it can measure from the anchors
   *  alone (the zero/negative-distance degenerate class) — never a silent
   *  accept of a degenerate output. The envelope is DATA, never an import —
   *  the absent-module state compiles clean. */
  admEnvelope?: AdmEnvelope | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE REFERENCE CONSTANTS (the Trident-v7.3 checkpoint 7.3 — archived, never
// invoked as the executor; the grep gate: fetch/axios/http = 0 in the
// reasoning path)
// ═══════════════════════════════════════════════════════════════════════════

/** The reference endpoint (the operator: "this IS the go endpoint. it is
 *  https://opencode.ai/zen/go/v1/chat/completions"). ARCHIVED — the retired
 *  executor's constant, kept as the reference pattern for any future
 *  agent-side call design. */
export const DEFAULT_ENDPOINT = 'https://opencode.ai/zen/go/v1/chat/completions';
/** THE MODEL — deepseek v4 flash ONLY via opencode go (the operator's choice).
 *  FROZEN per the Trident-v7.3 checkpoint pattern. ARCHIVED with the retired
 *  executor — the agent-in-session's model is the primary opencode agent's
 *  own. */
export const SHADOW_MODEL = 'deepseek-v4-flash';
/** THE STALL-DETECTOR idle window (the L2 spec C4 — the SSE-stream timer
 *  resets per received chunk). ARCHIVED with the retired executor. */
export const IDLE_WINDOW_MS = 90_000;

// ═══════════════════════════════════════════════════════════════════════════
// THE GROUNDING CONTRACT CHECKS (the D2 law — a violation is a WARN, NEVER a
// hard-kill; the operator: "these cannot hard kill the fucking agent are you
// stupid these need to be a warn that continues the agent loop")
// ═══════════════════════════════════════════════════════════════════════════

function checkDirectionOrder(
  direction: 'LONG' | 'SHORT',
  entry: number,
  sl: number,
  tp: number,
): string | null {
  if (direction === 'LONG' && !(sl < entry && entry < tp)) {
    return `SHADOW_SHAPE_VIOLATION: LONG requires sl < entry < tp (got sl=${sl} entry=${entry} tp=${tp})`;
  }
  if (direction === 'SHORT' && !(tp < entry && entry < sl)) {
    return `SHADOW_SHAPE_VIOLATION: SHORT requires tp < entry < sl (got tp=${tp} entry=${entry} sl=${sl})`;
  }
  return null;
}

/**
 * The token-11 MECHANICAL FLOOR — the real checks that run BEFORE any agent
 * blessing. The agent's reasoning can never override a mechanical violation
 * into "valid". The checks are the direction order, the RRR floor, and the
 * macro consistency — each is a real comparison over the projection's
 * numbers, never a hardcoded pass.
 */
function computeValidationFloor(p: TradeProjection, ledger: ChainContext): ValidationOutput {
  const warnings: ValidationOutput['warnings'] = [];
  const longOrderOk = p.SL < p.E && p.E < p.TP;
  const shortOrderOk = p.TP < p.E && p.E < p.SL;
  const orderOk = p.direction === 'LONG' ? longOrderOk : shortOrderOk;
  const floorOk = p.RRR >= 1.0;
  const macroOk = ledger.macroConsistent || p.direction === ledger.macroDirection;
  if (!orderOk) {
    warnings.push({
      check: 'DIRECTION_ORDER',
      token: 'validation',
      sourceRef: `shadow:floor:${p.setupId}`,
      value: { E: p.E, SL: p.SL, TP: p.TP, direction: p.direction },
      proposed: 'LONG requires SL < E < TP; SHORT requires TP < E < SL — re-anchor the projection',
    });
  }
  if (!floorOk) {
    warnings.push({
      check: 'RRR_BELOW_FLOOR',
      token: 'validation',
      sourceRef: `shadow:floor:${p.setupId}`,
      value: p.RRR,
      proposed: 'the RRR < 1.0 — a sub-1R projection is a refinement warning',
    });
  }
  if (!macroOk) {
    warnings.push({
      check: 'MACRO_DIVERGENCE',
      token: 'validation',
      sourceRef: `shadow:floor:${p.setupId}`,
      value: { projection: p.direction, macro: ledger.macroDirection },
      proposed: 'the macro wins the emission — record the divergence, never suppress it',
    });
  }
  return { valid: orderOk && floorOk, warnings, confidence: p.confidence };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE WARN SET (the D2 law — the machine's validation of the agent's output)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * THE D2 WARN-SET VALIDATOR — validate the agent's in-session decisions
 * against the WARN set (W-1..W-7). NEVER throws: every violation is a
 * RefinementWarning (the GROUNDING_WARN row the caller records to the failure
 * store); the agent loop CONTINUES with the WARN as the refinement input. The
 * hard-throw is the CALLER's decision (REFINEMENT_EXHAUSTED only after 3).
 *
 * @param d            the agent's decisions (or the partial deterministic
 *                     skeleton when the agent emitted nothing malformed)
 * @param ctx          the grounding context — the closed continuation-target
 *                     set (W-4), the valid e1 zone ids (W-5), the valid e2
 *                     projection ids (W-6), the direction (W-3)
 * @param direction    the projection direction (W-3's order predicate)
 * @returns            the RefinementWarning[] (empty = clean) — never throws
 */
export function validateAgentDecisions(
  d: Omit<Partial<ReasoningStepDecisions>, 'chosenTarget'> & { chosenTarget?: string | number },
  ctx: { continuationTargets: number[]; e1ZoneIds: string[]; e2ProjectionIds: string[] },
  direction: 'LONG' | 'SHORT',
): RefinementWarning[] {
  const warns: RefinementWarning[] = [];
  // W-1 the forwardPosition is a number (a string / NaN / absent)
  if (typeof d.forwardPosition !== 'number' || !Number.isFinite(d.forwardPosition)) {
    warns.push({
      check: 'W-1_FORWARD_POSITION_NUMERIC',
      token: 'forward-position',
      sourceRef: 'reasoning-decisions.forwardPosition',
      value: d.forwardPosition,
      proposed: "re-emit the forward position as a number of pips from the zone's near edge",
    });
  }
  // W-2 the entry/sl/tp are numbers (a string / NaN / absent)
  const anchorKeys: Array<[keyof ReasoningStepDecisions, string]> = [
    ['E', 'E'],
    ['SL', 'SL'],
    ['TP', 'TP'],
  ];
  for (const [key, label] of anchorKeys) {
    const v = d[key as keyof ReasoningStepDecisions];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      warns.push({
        check: 'W-2_ANCHORS_NUMERIC',
        token: 'anchors',
        sourceRef: `reasoning-decisions.${key as string}`,
        value: v,
        proposed: `re-emit the ${label} anchor as a numeric price level`,
      });
    }
  }
  // W-3 the E/SL/TP direction-order (LONG: E < SL < TP violated; SHORT: E > SL > TP)
  if (typeof d.E === 'number' && typeof d.SL === 'number' && typeof d.TP === 'number') {
    const orderErr = checkDirectionOrder(direction, d.E, d.SL, d.TP);
    if (orderErr) {
      warns.push({
        check: 'W-3_DIRECTION_ORDER',
        token: 'anchors',
        sourceRef: 'reasoning-decisions.E/SL/TP',
        value: { E: d.E, SL: d.SL, TP: d.TP, direction },
        proposed: 're-order the anchors so the SL sits beyond the entry on the adverse side',
      });
    }
  }
  // W-4 the chosenTarget ∈ the CLOSED continuationTargets set (never extended)
  const chosen = d.chosenTarget;
  const inClosedSet =
    typeof chosen === 'number'
      ? ctx.continuationTargets.some((t) => Math.abs(t - chosen) < 1e-9)
      : typeof chosen === 'string'
        ? ctx.continuationTargets.some((t) => t.toFixed(5) === chosen)
        : false;
  if (chosen !== undefined && !inClosedSet) {
    warns.push({
      check: 'W-4_CHOSEN_TARGET_CLOSED',
      token: 'forward-position',
      sourceRef: 'reasoning-decisions.chosenTarget',
      value: chosen,
      proposed: `pick from the closed set: {${ctx.continuationTargets.map((t) => t.toFixed(5)).join(', ')}} — never extend it`,
    });
  }
  // W-5 the e1ZoneId ∈ the E1 zone map (an invented id)
  if (d.e1ZoneId !== undefined && !ctx.e1ZoneIds.includes(d.e1ZoneId)) {
    warns.push({
      check: 'W-5_E1ZONE_ID_REAL',
      token: 'anchors',
      sourceRef: 'reasoning-decisions.e1ZoneId',
      value: d.e1ZoneId,
      proposed: `use a real zone id from the map (the candidate list provided: ${ctx.e1ZoneIds.slice(0, 5).join(', ')}${ctx.e1ZoneIds.length > 5 ? ', …' : ''})`,
    });
  }
  // W-6 the e2ProjectionId ∈ the E2 chain (an invented id)
  if (d.e2ProjectionId !== undefined && !ctx.e2ProjectionIds.includes(d.e2ProjectionId)) {
    warns.push({
      check: 'W-6_E2PROJECTION_ID_REAL',
      token: 'anchors',
      sourceRef: 'reasoning-decisions.e2ProjectionId',
      value: d.e2ProjectionId,
      proposed: `use a real projection id from the chain (the candidate list provided: ${ctx.e2ProjectionIds.slice(0, 5).join(', ')}${ctx.e2ProjectionIds.length > 5 ? ', …' : ''})`,
    });
  }
  // W-7 the RRR is computable (a zero/negative SL distance)
  if (typeof d.E === 'number' && typeof d.SL === 'number' && d.E === d.SL) {
    warns.push({
      check: 'W-7_RRR_COMPUTABLE',
      token: 'anchors',
      sourceRef: 'reasoning-decisions.E/SL',
      value: { E: d.E, SL: d.SL },
      proposed: 're-anchor the SL so the RRR is a positive finite consequence',
    });
  }
  return warns;
}

/** The defensive JSON parse (the harness response validator — kept for any
 *  future agent-side response handling; the pipeline no longer parses an
 *  external model's output). */
export function parseJsonResponse(content: string): unknown | null {
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence && fence[1]) text = fence[1]!.trim();
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart >= 0 && objEnd > objStart) text = text.slice(objStart, objEnd + 1);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE SHADOW-ENVELOPE FIREWALL (the W-ADM-4 — the PLUTUS_V4.5.4_ADM_L2_SPEC
// §2.5.5, lines 424-425 + §3 W-ADM-4 line 471 + AP-6 line 507): the shadow's
// anchor output (the LLM's in-session E/SL/TP) is validated against the ADM's
// measured envelope — the SL INSIDE the measured wick territory / the RRR
// below the 3.0 floor / a degenerate pair → the SHADOW_FLAG warning + the
// deterministic ADM result STANDS (the operator: "should honestly work without
// model influence — all trading is like 95% deterministic"). The reasoning
// chain ALREADY consumes the flag (reasoning-chain.ts line 1571 filters
// w.check === 'SHADOW_FLAG' + line 1574 merges) — this section is the MISSING
// EMITTER. The envelope arrives as DATA (never an import from the ADM module —
// the absent-module state today compiles clean and wires the moment the module
// lands; the CME §2.4 grep gate: zero network calls in the reasoning path).
// ═══════════════════════════════════════════════════════════════════════════

/** THE ADM MEASURED ENVELOPE (the spec §2.2-§2.4 measurement shapes, passed as
 *  an input — never imported from anchor-decision-machine.ts, which the
 *  W-ADM-1 wave owns concurrently). present:false = the honest absence (no ADM
 *  measurements yet) — the validator then fires ONLY on the geometry it can
 *  measure from the anchors alone (the zero/negative-distance degenerate pair
 *  class), so a degenerate output is never silently accepted. */
export interface AdmEnvelope {
  /** false = the honest absence (the W-ADM-1 module has not landed / produced
   *  no measurements for this pair) — the envelope checks no-op, the
   *  anchors-detectable degenerate checks still fire. */
  present: boolean;
  direction: 'LONG' | 'SHORT';
  /** The pair's pip size (the price→pips scale of the risk/reward). */
  pip: number;
  /** m1 — the measured reaction-wick extreme (a PRICE — spec §2.2 m1): the min
   *  touch LOW pushed into a DEMAND (LONG) / the max touch HIGH into a SUPPLY
   *  (SHORT) within the recency window. The SL must clear it (LAW-3 — the
   *  operator's read #1: "pierces through w/ a wick"). */
  wickExtreme: number;
  /** m2 — the measured wick dispersion (the median |touch − closeEdge| in
   *  pips — the anti-outlier MEDIAN, spec §2.2 m2 + AP-9). Added ONE dispersion
   *  beyond the extreme — the SL sits beyond the territory, never inside. */
  wickDispersionPips?: number;
  /** The RRR headroom floor (the operator's canon — spec §2.4 verify gate line
   *  374: rrr < floor − 1e-9 → RRR_BELOW_FLOOR; an RRR exactly at the floor
   *  PASSES, a hair below FAILS). */
  rrrFloor: number;
  /** The pair-scale sliver floor (spec §8.1's MIN_VIABLE_DEFENSE
   *  recommendation — the measured dispersion percentile, never a bare
   *  constant): a risk below it = the sliver-SL (the F-5 RRR-16.8 class). */
  minViableDefensePips?: number;
  /** The W6 minimum rung width (mirror.ts's MIN_RUNG_WIDTH_PIPS — supplied by
   *  the ADM, never re-declared here, AP-8): a reward below it = the
   *  zero-width degenerate-rung TP (the F-5 phantom class). */
  minRungWidthPips?: number;
}

/** THE FIREWALL VERDICT — { ok: true } = the anchors are within the measured
 *  envelope; { ok: false } = a SHADOW_FLAG RefinementWarning naming the exact
 *  geometry violation (the deterministic ADM result stands). */
export type AdmEnvelopeVerdict =
  | { ok: true }
  | { ok: false; warning: RefinementWarning };

/** THE FIREWALL'S FLOAT EPSILON (the named calibration — the ADM spec §2.4
 *  verify gate's 1e-9, line 374: "rrr < 3.0 - 1e-9 → RRR_BELOW_FLOOR" — an RRR
 *  exactly at the floor PASSES, a hair below FAILS) + the codebase's canonical
 *  float-comparison tolerance (the same 1e-9 the chain uses for the
 *  continuation-target membership, reasoning-chain.ts line 307, and the W-7
 *  SL==E detection, shadow-agent.ts line 341). One epsilon for all three
 *  firewall comparisons — a single calibrated value, never three unnamed
 *  ladders. */
const SHADOW_FLAG_EPSILON = 1e-9;

/**
 * THE SHADOW-ENVELOPE VALIDATOR (the W-ADM-4 core — a PURE, deterministic
 *  function; zero I/O, zero imports from the ADM module — the envelope is an
 *  input). The three reject triggers, per the spec:
 *    1. the SL INSIDE the measured wick territory → the SHADOW_FLAG
 *       (the W-ADM-4 line 471 + AP-6 line 507 + the acceptance — NOT the
 *       spec line 425's "outside" inversion; the files + the operator's intent
 *       say INSIDE: the SL must sit BEYOND the measured extreme + one
 *       dispersion, never inside the territory);
 *    2. the RRR < rrrFloor (3.0) with the verify-gate epsilon (line 374) →
 *       the SHADOW_FLAG ("MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE");
 *    3. a degenerate pair (the sliver-SL below the minimum-viable defense OR
 *       the zero-width degenerate-rung TP — the F-5 RRR-16.8 phantom class)
 *       → the SHADOW_FLAG — a degenerate geometry is REJECTED at the gate,
 *       never an emission (mirror.ts's W6 rung-validity pattern, ~line 2808).
 *  The zero/negative SL-distance + zero-width TP are detectable from the
 *  anchors ALONE (the W-7 class) — they fire even when the envelope is absent,
 *  so a degenerate output is never silently accepted. A within-envelope output
 *  returns { ok: true }. Every violation is ENCODED (a warning), never thrown
 *  (the D2 law).
 */
export function validateAgainstAdmEnvelope(
  anchors: { E: number; SL: number; TP: number },
  envelope: AdmEnvelope | null,
): AdmEnvelopeVerdict {
  const { E, SL, TP } = anchors;
  const pip = envelope?.present ? envelope.pip : 0;
  const direction = envelope?.direction ?? 'LONG';
  const riskRaw = Math.abs(E - SL);
  const rewardRaw = Math.abs(TP - E);
  const riskPips = pip > 0 ? riskRaw / pip : 0;
  const rewardPips = pip > 0 ? rewardRaw / pip : 0;

  const flag = (reason: string): AdmEnvelopeVerdict => ({
    ok: false as const,
    warning: {
      check: 'SHADOW_FLAG',
      token: 'anchors',
      sourceRef: 'shadow-agent.ts:validateAgainstAdmEnvelope',
      value: {
        E,
        SL,
        TP,
        direction,
        envelope: envelope?.present
          ? {
              wickExtreme: envelope.wickExtreme,
              wickDispersionPips: envelope.wickDispersionPips ?? 0,
              rrrFloor: envelope.rrrFloor,
              minViableDefensePips: envelope.minViableDefensePips,
              minRungWidthPips: envelope.minRungWidthPips,
            }
          : null,
      },
      proposed: `${reason} — the deterministic ADM result STANDS (the LLM refinement is rejected: the anchor output is outside the measured envelope)`,
    },
  });

  // 1. THE DEGENERATE-PAIR GEOMETRY (the operator's loudest law — spec §1 F-5 +
  //    §2.4 lines 376-384: "an RRR is only a MEASUREMENT when BOTH halves come
  //    from real structures"). The zero/negative SL distance (the W-7 class)
  //    + the zero-width TP are detectable from the anchors ALONE — they fire
  //    WITHOUT the envelope, so the no-op never silently accepts a degenerate
  //    output.
  if (riskRaw <= SHADOW_FLAG_EPSILON) {
    return flag(`DEGENERATE_PAIR_REJECTED: the SL distance is ${riskRaw.toFixed(5)} (a zero/negative risk — the W-7 RRR-computable class) — a sliver-SL degenerate pair is never an emission`);
  }
  if (rewardRaw <= SHADOW_FLAG_EPSILON) {
    return flag(`DEGENERATE_PAIR_REJECTED: the TP distance is ${rewardRaw.toFixed(5)} (a zero-width degenerate TP — the RRR-16.8 phantom class) — a degenerate pair is never an emission`);
  }
  if (envelope?.present) {
    if (envelope.minViableDefensePips !== undefined && riskPips < envelope.minViableDefensePips) {
      return flag(`DEGENERATE_PAIR_REJECTED: the SL defense is ${riskPips.toFixed(2)}p below the pair's minimum-viable defense ${envelope.minViableDefensePips}p (the sliver-SL — the RRR-16.8 phantom class, "what the actual FUCK is this? this was a flat 2R trade") — a degenerate pair is never an emission`);
    }
    if (envelope.minRungWidthPips !== undefined && rewardPips < envelope.minRungWidthPips) {
      return flag(`DEGENERATE_PAIR_REJECTED: the TP distance is ${rewardPips.toFixed(2)}p below the W6 minimum rung width ${envelope.minRungWidthPips}p (the zero-width degenerate-rung TP — the RRR-16.8 phantom class) — a degenerate pair is never an emission`);
    }
  }

  // 2. THE SL-INSIDE-WICK-TERRITORY CHECK (the W-ADM-4 / AP-6 trigger — the
  //    majority phrasing + the operator's intent: the SL INSIDE the measured
  //    reaction-wick territory → the SHADOW_FLAG. The SL must sit strictly
  //    BEYOND the measured extreme + ONE dispersion (LAW-3 — the operator's
  //    read #1). The spec line 425's "outside" phrasing is the documented
  //    inversion — INSIDE is enforced per W-ADM-4 line 471 + AP-6 line 507.)
  if (envelope?.present && Number.isFinite(envelope.wickExtreme)) {
    const dispersionPips = envelope.wickDispersionPips ?? 0;
    const dispersion = dispersionPips * pip;
    if (direction === 'LONG') {
      // LONG: the SL sits BELOW the demand's min-low − the dispersion. An SL at
      // or above the boundary is INSIDE the territory the wicks have reached.
      const territoryBoundary = envelope.wickExtreme - dispersion;
      if (SL >= territoryBoundary) {
        return flag(`the SL ${SL.toFixed(5)} is INSIDE the measured wick territory (the min-low ${envelope.wickExtreme.toFixed(5)} minus the dispersion ${dispersionPips}p = ${territoryBoundary.toFixed(5)}) — the SL must sit strictly BEYOND the measured reaction-wick extreme + the dispersion (the F-1/F-2 class — "the market will eat all fixed const hardcoded garbage alive")`);
      }
    } else {
      // SHORT: the SL sits ABOVE the supply's max-high + the dispersion. An SL
      // at or below the boundary is INSIDE the territory the wicks have reached.
      const territoryBoundary = envelope.wickExtreme + dispersion;
      if (SL <= territoryBoundary) {
        return flag(`the SL ${SL.toFixed(5)} is INSIDE the measured wick territory (the max-high ${envelope.wickExtreme.toFixed(5)} plus the dispersion ${dispersionPips}p = ${territoryBoundary.toFixed(5)}) — the SL must sit strictly BEYOND the measured reaction-wick extreme + the dispersion (the F-1/F-2 class — the EU SHORT's 0.5p pierce)`);
      }
    }
  }

  // 3. THE RRR HEADROOM FLOOR (the operator: "MINIMUM 3 RRR NOTHING LESS IS
  //    ACCEPTABLE" — spec §2.4 line 374 with the 1e-9 epsilon: an RRR exactly
  //    at the floor PASSES, a hair below FAILS. The safety envelope: "3R is
  //    better than a loss").
  if (envelope?.present) {
    const rrr = riskPips > 0 ? rewardPips / riskPips : 0;
    if (rrr < envelope.rrrFloor - SHADOW_FLAG_EPSILON) {
      return flag(`RRR_BELOW_FLOOR: the RRR ${rrr.toFixed(2)} is below the envelope floor ${envelope.rrrFloor} (reward ${rewardPips.toFixed(1)}p / risk ${riskPips.toFixed(1)}p) — MINIMUM ${envelope.rrrFloor} RRR NOTHING LESS IS ACCEPTABLE`);
    }
  }

  return { ok: true as const };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CLIENT (the reasoning-step CONTRACT LAYER — the step wrappers + the
// errResult validation + the failure-store integration STAY; the executor is
// the PRIMARY AGENT in-session)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the reasoning-step contract-layer client. The methods VALIDATE the
 * deterministic floor's grounding (the WARN set — W-1..W-7) and return
 * ok/errResult — the D2 law: a violation is an errResult (the GROUNDING_WARN
 * row the caller records + the loop continues), NEVER a throw. The EXECUTOR
 * is the PRIMARY AGENT in-session — this client NEVER fabricates a reasoning
 * value: on ok it returns the mechanical floor's skeleton (the operative
 * zone's near edge + the first closed-set target — a real computation over
 * the input, never an invented price), and the reasoning chain's deterministic
 * skeleton is ALWAYS the validity authority.
 */
export function createShadowAgentClient(opts: ShadowAgentOptions = {}): ShadowAgentClient {
  void opts; // the reference options (endpoint/model/apiKey/timeoutMs) are
  // archived with the retired executor — the contract layer needs no key.
  // THE ADM ENVELOPE (the W-ADM-4 firewall's input — the measured envelope
  // this client bounds its anchor output against; absent → the honest no-op
  // on the measurement-gated checks, the anchors-detectable degenerate checks
  // still fire).
  const admEnvelope: AdmEnvelope | null = opts.admEnvelope ?? null;
  const client: ShadowAgentClient = {
    provider: 'opencode-go-deepseek-v4-flash',
    available: true,
    lastError: null,

    async projectForward(inp: ForwardProjectionInput): Promise<ShadowResult<ForwardProjectionOutput>> {
      // The contract layer validates the deterministic floor's grounding
      // (W-4 the CLOSED continuationTargets set — the machine's candidates
      // are never extended). The agent-in-session reasoning (the W6 STEP B
      // tool) refines this floor; the machine's validation is the WARN set,
      // never a hard-kill.
      const warns = validateAgentDecisions(
        { chosenTarget: inp.continuationTargets[0] },
        { continuationTargets: inp.continuationTargets, e1ZoneIds: [], e2ProjectionIds: [] },
        inp.macro.direction,
      );
      if (warns.length > 0) {
        client.lastError = `GROUNDING_WARN: ${warns[0]!.check} — ${warns[0]!.proposed}`;
        return errResult(client.lastError);
      }
      client.lastError = null;
      return okResult({
        forwardPosition: inp.operativeZone.floor,
        chosenTarget: inp.continuationTargets[0] ?? inp.operativeZone.floor,
        positionVerdict: 'NOT_FORWARD',
        reasonTrace: ['contract-layer: the deterministic floor stands — the agent-in-session refines it'],
        llmRefined: false,
      });
    },

    async chaining(inp: ChainingInput): Promise<ShadowResult<ChainingOutput>> {
      // The chaining (Law 27 — the TP of N = the entry of N+1) is a SYNC
      // deterministic law (token 9) — the contract layer simply records the
      // presence of the cascades.
      client.lastError = null;
      return okResult({
        chainVerdict: true,
        linkedMirror: null,
        divergence: null,
        llmRefined: false,
      });
    },

    async anchor(inp: AnchorInput): Promise<ShadowResult<AnchorOutput>> {
      // The contract layer validates the deterministic anchors' grounding
      // (W-5 the e1ZoneId ∈ the E1 map — the operative zone IS the real id;
      // W-6 the e2ProjectionId ∈ the E2 chain — the input's projection id is
      // the chain's real id; W-7 the RRR computable — the SL candidate must
      // differ from the entry). A violation is an errResult (the WARN row +
      // the loop continues), NEVER a throw.
      const warns = validateAgentDecisions(
        { e1ZoneId: inp.operativeZone.id, e2ProjectionId: inp.e2ProjectionId },
        { continuationTargets: [], e1ZoneIds: [inp.operativeZone.id], e2ProjectionIds: [inp.e2ProjectionId] },
        inp.direction,
      );
      if (warns.length > 0) {
        client.lastError = `GROUNDING_WARN: ${warns[0]!.check} — ${warns[0]!.proposed}`;
        return errResult(client.lastError);
      }
      client.lastError = null;
      // THE W-ADM-4 ENVELOPE FIREWALL (the spec §2.5.5 — the shadow's anchor
      // output is validated against the ADM's measured envelope BEFORE it is
      // returned into the chain): the SL inside the measured wick territory /
      // the RRR below the 3.0 floor / a degenerate pair → the errResult (the
      // SHADOW_FLAG refusal) → the chain's token10 (reasoning-chain.ts line
      // 1304-1306) falls back to the DETERMINISTIC anchors — the deterministic
      // ADM result STANDS in every flagged case. The within-envelope output
      // returns unmodified (the legitimate LLM refinement flows).
      const anchorOutput: AnchorOutput = {
        entry: inp.operativeZone.ceiling,
        sl: inp.slCandidate ?? inp.operativeZone.floor,
        tp: inp.tpCandidate ?? inp.operativeZone.ceiling,
        rrr: 0,
        anchors: [
          { role: 'ENTRY', price: inp.operativeZone.ceiling, e1ZoneId: inp.operativeZone.id, e2ProjectionId: inp.e2ProjectionId, method: 'contract-layer-floor' },
          { role: 'SL', price: inp.slCandidate ?? inp.operativeZone.floor, e1ZoneId: inp.operativeZone.id, e2ProjectionId: inp.e2ProjectionId, method: 'contract-layer-floor' },
          { role: 'TP', price: inp.tpCandidate ?? inp.operativeZone.ceiling, e1ZoneId: inp.operativeZone.id, e2ProjectionId: inp.e2ProjectionId, method: 'contract-layer-floor' },
        ],
        llmRefined: false,
      };
      const env = validateAgainstAdmEnvelope(
        { E: anchorOutput.entry, SL: anchorOutput.sl, TP: anchorOutput.tp },
        admEnvelope,
      );
      if (!env.ok) {
        client.lastError = `SHADOW_FLAG: ${env.warning.proposed}`;
        return errResult(client.lastError);
      }
      return okResult(anchorOutput);
    },

    async validateProjection(
      p: TradeProjection,
      ledger: ChainContext,
    ): Promise<ShadowResult<ValidationOutput>> {
      // THE MECHANICAL FLOOR runs FIRST — the real checks (direction order,
      // RRR floor, macro consistency). The projection's validity is ALWAYS the
      // floor's verdict; the agent's reasoning refines only the confidence.
      const floor = computeValidationFloor(p, ledger);
      // THE W-ADM-4 ENVELOPE FIREWALL (the spec §2.5.5 — the chain's line 1571
      // ALREADY filters w.check === 'SHADOW_FLAG' + line 1574 merges; this is
      // the EMITTER): the projection's anchors are validated against the ADM's
      // measured envelope — a violation appends the SHADOW_FLAG warning to the
      // ValidationOutput.warnings the chain reads. The flag is a WARN (the D2
      // law — it CONTINUES the loop, never a hard-kill); the deterministic
      // result stands because the flag never flips the floor's validity and
      // never triggers the refinement's TP-extension (refineProjection only
      // reads RRR_BELOW_GATE, never SHADOW_FLAG).
      const env = validateAgainstAdmEnvelope({ E: p.E, SL: p.SL, TP: p.TP }, admEnvelope);
      if (!env.ok) {
        floor.warnings.push(env.warning);
      }
      client.lastError = floor.valid
        ? null
        : 'SHADOW_FLOOR_VIOLATION: the mechanical floor (order/RRR/macro) failed — the warnings carry the corrections';
      return okResult(floor);
    },
  };
  return client;
}
