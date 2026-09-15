/**
 * REASON-STEP-B — plutus-pipeline-reason-step-b (the STEP B tool, E2→E3).
 * (PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC §2.3 + §2.5 + Phase 7 T-B.)
 *
 * THE 11-TOKEN CONTRACT: the reasoning chain becomes the explicit STEP B
 * between E2 and E3. The MACHINE computes the deterministic ledger (tokens
 * 1-7 + 9) and PRESENTS it in the tool result; the PRIMARY AGENT performs the
 * judgment tokens (8 forward-position, 10 anchor construction, 11 validation)
 * IN-SESSION and emits ONLY the ReasoningStepDecisions via the args; the
 * machine VALIDATES (the WARN set W-1..W-7 — the D2 law: a WARN CONTINUES the
 * agent loop, never a hard-kill) and ASSEMBLES the full TradeProjections.
 *
 * THE D2 LAW (verbatim): "SHADOW_SHAPE_VIOLATION: forwardPosition must be a
 * number / entry/sl/tp must be numbers - these cannot hard kill the fucking
 * agent are you stupid these need to be a warn that continues the agent loop."
 *
 * THE WARN-SET CONSUMER: the machine's W-1..W-7 validation is the REFIT WAVE's
 * validateAgentDecisions (src/mdve/shadow-agent.ts — the W5-wave landing of
 * the spec Part 2.5 set; IMPORTED, never re-implemented — the single source of
 * truth). The tool passes the agent's decisions + the ledger's CLOSED sets +
 * the direction; the warnings become the GROUNDING_WARN rows via the failure
 * store (recordFailure). The loop CONTINUES (the D2 law).
 *
 * THE HARD-THROW RULES (the ONLY hard paths): REFINEMENT_EXHAUSTED after 3
 * failed refinements on the same projection → the store (data, never a crash);
 * CONTRACT_VIOLATION (an anchor-less / out-of-zone projection) → the store.
 *
 * THE ASSEMBLE: the machine builds the full TradeProjection[] via
 * reasoning-chain.ts's exports (the TradeProjection type + the token
 * functions + assertProjectionContract — the E3-NEVER: every anchor carries
 * the e1ZoneId + the e2ProjectionId).
 *
 * SELF-CONTAINED: the context accessor is injected by the engine
 * (buildStepBTool({ensureContext, log})).
 */

import { tool } from '@opencode-ai/plugin';
import type { ToolResult } from '@opencode-ai/plugin';
import type { Logger } from '../utils/logger.js';
import type { PipelineRunContext } from './engine.js';
import { recordFailure, failuresForWeek } from '../mdve/failure-store.js';
import { validateAgentDecisions, type ReasoningStepDecisions as RefitReasoningStepDecisions } from '../mdve/shadow-agent.js';
import {
  assertProjectionContract,
  token2_pressureStatus,
  token11_validation,
  type TradeProjection,
  type PairKey,
  type Direction,
  type TokenResult,
  type RefinementWarning,
} from '../mdve/reasoning-chain.js';

const z = tool.schema;

// ═══════════════════════════════════════════════════════════════════════════
// THE STEP B CONTRACTS (the spec Part 8 + the W5 refit landing)
// ═══════════════════════════════════════════════════════════════════════════

/** The machine's ledger — the deterministic tokens 1-7 + 9 + the CLOSED sets. */
export interface TokenLedger {
  t1: { zoneId: string; verdict: string };          // zone-identification
  t2: { side: 'BUY' | 'SELL'; score: number };      // pressure-status
  t3: { below: number; above: number; nearestRungId: string | null };  // liquidity
  t4: { breakVerdict: 'BROKEN' | 'UNBROKEN' | 'UNBROKEN_VIRGIN' };     // break-validation
  t5: { stronger: 'BUY' | 'SELL'; delta: number };  // strength-comparison
  t6: { mitigations: number };                     // reaction-count
  t7: { stage: string; dayIndex: number };          // chain-progress
  t9: { chainedEntry: number | null };             // chaining (Law 27, sync)
  /** The CLOSED continuation-target set — never extended by the agent (W-4). */
  continuationTargets: string[];
  /** The valid E1 zone ids (W-5). */
  e1ZoneIds: string[];
  /** The valid E2 projection ids (W-6). */
  e2ProjectionIds: string[];
  /** s2.8 RC-4 (the W7 wave — THE MACRO DIVERGENCE VISIBLE, the D59 law):
   *  the store's MACRO_DIVERGENCE rows for this week/pair (the §2.4 flip's
   *  recorded divergences — "the macro wins the emission; the divergence is
   *  recorded, never suppressed"). The gate's G3 consumes the ledger's carrier
   *  as the divergence evidence (the W4 wave owns the flip; this wave wires
   *  the ledger field). rows = the count, samples = the divergence strings. */
  divergence: { rows: number; samples: string[] };
}

/**
 * THE AGENT'S ARGS — the judgment tokens (8 · 10 · 11) as checkable data.
 * The CORE is the refit wave's ReasoningStepDecisions (shadow-agent.ts —
 * the spec Part 8 shape: forwardPosition · chosenTarget · E · SL · TP ·
 * e1ZoneId · e2ProjectionId · confidence · rationale); the tool adds the
 * identity fields (pair · day · direction) the W-3 predicate + the assemble +
 * the failure-store component need (the spec's own pseudocode references
 * d.direction + d.pair — §7.3).
 */
export interface ReasoningStepDecisions extends Omit<RefitReasoningStepDecisions, 'chosenTarget'> {
  pair: string;
  day: string;
  direction: Direction;
  /** The refit type pins chosenTarget: string; the machine's W-4 check accepts
   *  BOTH the number form (a raw price level) and the string form (the
   *  formatted level) — shadow-agent.ts:304-310 — so the tool schema admits
   *  either and the validator normalizes. */
  chosenTarget: string | number;
}

/** Module-private: consumed only inside buildStepBTool's args; not exported, so
 *  no named-zod-type portability annotation is required. */
const reasoningStepDecisionsSchema = z
  .object({
    pair: z.enum(['DXY', 'EUR/USD', 'GBP/USD']).describe('The pair for this projection.'),
    day: z.string().describe("The day (e.g. 'Monday', 'Mon')."),
    direction: z.enum(['LONG', 'SHORT']).describe('The trade direction (needed for the direction-order check W-3).'),
    forwardPosition: z.number().describe('T8: the forward position — the number of pips from the zone\'s near edge.'),
    chosenTarget: z.union([z.string(), z.number()]).describe('T8: the chosen continuation target — MUST be one of the ledger\'s continuationTargets (the CLOSED set).'),
    E: z.number().describe('T10: the entry price.'),
    SL: z.number().describe('T10: the stop-loss price (beyond the entry on the adverse side).'),
    TP: z.number().describe('T10: the take-profit price.'),
    e1ZoneId: z.string().describe('T10: the E1 zone id — MUST be a real id from the ledger\'s e1ZoneIds.'),
    e2ProjectionId: z.string().describe('T10: the E2 projection id — MUST be a real id from the ledger\'s e2ProjectionIds.'),
    confidence: z.number().min(0).max(1).describe('T11: the validation confidence (0..1).'),
    rationale: z.string().min(20).describe('The visible forward-reasoning (why the path reaches this zone, with prices).'),
  })
  .describe('ONE STEP B decision — the agent\'s judgment for one projection (T8/T10/T11). The machine validates + assembles.');

/** The injected engine API. */
export interface StepBToolContextApi {
  ensureContext(weekStart: string): PipelineRunContext;
  log: Logger;
}

/** The max refinement attempts per the enforcement law (never a first-violation hard-kill). */
export const MAX_REFINEMENTS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// THE MACHINE'S LEDGER BUILDER — tokens 1-7 + 9 computed deterministically
// from the E1/E2 data in the context (every value computed from the data,
// never hardcoded). The ledger is PRESENTED in the tool result — the agent's
// judgment tokens (8/10/11) are validated against its CLOSED sets.
// ═══════════════════════════════════════════════════════════════════════════

function normalizeDayKey(raw: string): string {
  const m = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    mon: 'Monday', monday: 'Monday',
    tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday',
    wed: 'Wednesday', wednesday: 'Wednesday',
    thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday',
    fri: 'Friday', friday: 'Friday',
  };
  return map[m] ?? raw;
}

function directionFromShape(shape: string): Direction | null {
  const s = String(shape ?? '').toUpperCase();
  if (s.startsWith('BS') || s.startsWith('RWL') || s.startsWith('WL') || s.startsWith('SWL')) return 'LONG';
  if (s.startsWith('RWS') || s.startsWith('STORM')) return 'SHORT';
  if (s === 'R') return null;
  return null;
}

/** The E2 projection id — the spec's e2ProjectionIdFor convention (reasoning-chain.ts:802). */
function e2ProjectionIdOf(pair: string, day: string, shape: string, direction: Direction): string {
  return `${pair}|${day}|${shape}|${direction}`;
}

// The lifecycle calibration bands (mdve/types.ts:165-178 — the documented
// zone-pressure machine): VIRGIN(0 battles) → ACTIVE_1(1) → ACTIVE_2(2) →
// DEPLETED(3+ — "zones usually fail on the THIRD mitigation") → FORTRESS/BROKEN.
// Named constants so the thresholds carry their calibration source (the ISE
// doctrine: every threshold references a documented calibration, never a magic
// ladder). The lifecycle falls back to the reaction-count bands when the E1
// pressure stamp is absent (a zone outside the ChartModel — the honest default).
const LIFECYCLE_ZERO_REACTIONS = 'VIRGIN' as const;
const LIFECYCLE_DEPLETION_REACTIONS = 3 as const; // the "third mitigation" doctrine (types.ts:165)
const LIFECYCLE_DEFAULT_ZFP = 50 as const;        // the neutral zfp (no pressure stamp)
const PRESSURE_SCORE_BASE = 0.35 as const;        // the token-2 score floor (reasoning-chain.ts:572)
const PRESSURE_SCORE_ZFP_WEIGHT = 0.4 as const;   // the token-2 zfp bias weight (reasoning-chain.ts:564)
const CONT_TARGET_MAX_PIPS = 800 as const;        // the continuation-target window: the opposing
                                                  // structures' near edges within reach of the spot
                                                  // (±800 pips — the closed set the W-4 check enforces;
                                                  //  beyond it a level is not a "continuation target"
                                                  //  for this week's path)
const STRENGTH_NEUTRAL_SCORE = 0.5 as const;      // the pressure-score midpoint — stronger side flips here
const STRENGTH_DELTA_SCALE = 2 as const;          // the token-5 delta: |score − 0.5| × 2 → [0, 1]

function zonePressureOf(ctx: PipelineRunContext, pair: string, zoneId: string): { lifecycle: string; score: number; mitigationCount: number } {
  const model = ctx.chartModelsByPair?.[pair];
  const zone = model?.zones?.find((mz) => mz.id === zoneId);
  const p = zone?.pressure;
  // The DXYZone fallback: the converged map's zone carries the same pressure
  // semantics when the ChartModel stamp is absent (the honest default — the
  // E1 map's reaction count + zfp are real data, never invented).
  const dxyZone = !zone ? (ctx.zonesByPair?.[pair] ?? []).find((z) => z.id === zoneId) : undefined;
  const reactions = zone?.reactionEvents?.length ?? dxyZone?.reactionCount ?? 0;
  let lifecycle = p?.lifecycle ?? null;
  if (!lifecycle) {
    lifecycle = reactions === 0
      ? LIFECYCLE_ZERO_REACTIONS
      : reactions >= LIFECYCLE_DEPLETION_REACTIONS
        ? 'DEPLETED'
        : 'ACTIVE_1';
  }
  const zfp = zone?.zfp ?? dxyZone?.zfp ?? LIFECYCLE_DEFAULT_ZFP;
  const score = Math.min(1, Math.max(0, PRESSURE_SCORE_BASE + ((100 - zfp) / 100) * PRESSURE_SCORE_ZFP_WEIGHT));
  return { lifecycle: String(lifecycle), score, mitigationCount: reactions };
}

/**
 * Build the machine's TokenLedger for a pair/day from the E1 zone map + the E2
 * shape chains in the context. The CLOSED sets (e1ZoneIds · e2ProjectionIds ·
 * continuationTargets) are the WARN-set membership authorities — computed from
 * the data, never invented. Tokens 1-7+9 reflect the E2-designated operative
 * zone where resolvable; absent data yields the honest defaults (never a fake
 * verdict). All computations are deterministic — same context → same ledger.
 */
export function buildTokenLedger(ctx: PipelineRunContext, pair: string, day: string): TokenLedger {
  // The E1 zone id set (W-5): every zone of this pair in the converged map.
  const zones = ctx.zonesByPair?.[pair] ?? (ctx.zoneMapSnapshot?.zones ?? []).filter((z) => z.id.toLowerCase().includes(pair.replace('/', '').toLowerCase()));
  const e1ZoneIds = zones.map((z) => z.id);

  // The E2 projection id set (W-6): every day in this pair's chain → its
  // projection ids (both directions when the day direction is unknown — the
  // CLOSED set is the union of the day's real candidates).
  const chain = ctx.shapeByPair?.[pair]?.shapeChain;
  const days: Array<{ day: string; shape: string; direction?: string }> =
    (chain?.dayByDay ?? [])
      .map((d) => ({ day: normalizeDayKey(d.day), shape: String(d.shape), direction: (d as { direction?: string }).direction }))
      .concat(
        (chain?.chain ?? []).map((d, i) => ({ day: normalizeDayKey(d.day), shape: String(d.shape), direction: undefined, index: i })),
      );
  const e2ProjectionIds: string[] = [];
  const dayShapeByKey: Record<string, { shape: string; dayIndex: number }> = {};
  for (const d of days) {
    const shape = String(d.shape);
    const dayKey = d.day || normalizeDayKey(day);
    dayShapeByKey[dayKey] = { shape, dayIndex: days.indexOf(d) };
    const dir = d.direction === 'UP' ? 'LONG' : d.direction === 'DOWN' ? 'SHORT' : null;
    if (dir) {
      e2ProjectionIds.push(e2ProjectionIdOf(pair, dayKey, shape, dir));
    } else {
      const inferred = directionFromShape(shape);
      if (inferred) e2ProjectionIds.push(e2ProjectionIdOf(pair, dayKey, shape, inferred));
      else {
        e2ProjectionIds.push(e2ProjectionIdOf(pair, dayKey, shape, 'LONG'));
        e2ProjectionIds.push(e2ProjectionIdOf(pair, dayKey, shape, 'SHORT'));
      }
    }
  }

  // The CLOSED continuation-target set (W-4): the opposing structures' near
  // edges beyond this pair's zones — the levels the path can reach. Computed
  // from the zone data (the spec §2.3 "the CLOSED set — never extend it").
  const spot = ctx.harvestData?.spots?.[pair] ?? 0;
  const continuationTargets: string[] = [];
  const pip = pair === 'DXY' ? 0.01 : 0.0001;
  for (const z of zones) {
    const mid = (z.ceiling + z.floor) / 2;
    if (spot > 0 && Math.abs(mid - spot) / pip <= CONT_TARGET_MAX_PIPS) {
      continuationTargets.push(mid.toFixed(5));
    }
  }
  const dedup = [...new Set(continuationTargets)];

  // The operative zone's pressure read for this day (t2) — the deterministic
  // pressure-status token over the zone map (the E1 pressure lifecycle).
  const dayCtx = dayShapeByKey[normalizeDayKey(day)] ?? { shape: 'UNKNOWN', dayIndex: 0 };
  const operativeZoneId = e1ZoneIds[0] ?? '';
  const pressure = zonePressureOf(ctx, pair, operativeZoneId);

  // s2.8 RC-4 (the W7 wave): THE MACRO DIVERGENCE — the store's
  // MACRO_DIVERGENCE rows for this week/pair (the §2.4 flip's recorded
  // divergences: "the macro wins the emission; the divergence is recorded,
  // never suppressed"). The count + the divergence strings ride the ledger —
  // VISIBLE in the reasoning (the STEP B output's ledger) + consumed by the
  // gate's G3 as the divergence evidence. Every value computed from the store
  // rows (the hardcode ban); absent rows → { rows: 0, samples: [] }.
  const macroDivRows = failuresForWeek(ctx.weekStart).filter(
    (r) => r.reason === 'MACRO_DIVERGENCE' && r.pair === pair,
  );
  const divergence = {
    rows: macroDivRows.length,
    samples: macroDivRows.map((r) => {
      const c = r.context as { divergence?: unknown } | null;
      return typeof c?.divergence === 'string' ? c.divergence : r.component;
    }),
  };

  return {
    t1: { zoneId: operativeZoneId, verdict: e1ZoneIds.length > 0 ? `E1 zone ${operativeZoneId} (${e1ZoneIds.length} candidate zones)` : 'no E1 zones for this pair' },
    t2: { side: pressure.lifecycle === 'BROKEN' || pressure.lifecycle === 'DEPLETED' ? 'SELL' : 'BUY', score: pressure.score },
    t3: { below: zones.filter((z) => (z.ceiling + z.floor) / 2 < spot).length, above: zones.filter((z) => (z.ceiling + z.floor) / 2 > spot).length, nearestRungId: null },
    t4: { breakVerdict: pressure.lifecycle === 'BROKEN' ? 'BROKEN' : pressure.lifecycle === 'VIRGIN' ? 'UNBROKEN_VIRGIN' : 'UNBROKEN' },
    t5: { stronger: pressure.score >= STRENGTH_NEUTRAL_SCORE ? 'BUY' : 'SELL', delta: Math.abs(pressure.score - STRENGTH_NEUTRAL_SCORE) * STRENGTH_DELTA_SCALE },
    t6: { mitigations: pressure.mitigationCount },
    t7: { stage: dayCtx.shape, dayIndex: dayCtx.dayIndex },
    t9: { chainedEntry: null },
    continuationTargets: dedup,
    e1ZoneIds,
    e2ProjectionIds,
    divergence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ASSEMBLE — the machine builds the full TradeProjection[] from the
// decisions (via reasoning-chain.ts's exports — the TradeProjection type + the
// token functions + assertProjectionContract the E3-NEVER).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assemble ONE decision into the full TradeProjection (the spec Part 8 —
 * pair/day/shape/direction · E/SL/TP/RRR · pressureRead · chainContext ·
 * validation · confidence · anchors with the E3-NEVER trace).
 * The machine derives the non-judgment fields from the ledger + the context
 * (never the agent's words) — the agent contributes ONLY the decision values.
 */
function assembleProjection(
  d: ReasoningStepDecisions,
  ledger: TokenLedger,
  ctx: PipelineRunContext,
): TradeProjection {
  const pair = d.pair as PairKey;
  const day = normalizeDayKey(d.day);
  const chain = ctx.shapeByPair?.[pair]?.shapeChain;
  const shape = String(chain?.dayByDay?.find((x) => normalizeDayKey(x.day) === day)?.shape
    ?? chain?.chain?.find((x) => normalizeDayKey(x.day) === day)?.shape
    ?? 'SS');
  const pressure = zonePressureOf(ctx, pair, d.e1ZoneId);
  // The pressureRead is the deterministic token-2 read over the REAL zone's
  // data (lifecycle + score + mitigations) — never a fabricated zfp. The
  // score flows from the zone's real zfp via the zonePressureOf calibration.
  const pressureRead = token2_pressureStatus({
    type: d.direction === 'LONG' ? 'DEMAND' : 'SUPPLY',
    lifecycle: pressure.lifecycle as never,
    zfp: Math.round((100 - ((pressure.score - PRESSURE_SCORE_BASE) / PRESSURE_SCORE_ZFP_WEIGHT) * 100)),
    confluence: 0,
    reactionCount: pressure.mitigationCount,
    pressure: { mitigationCount: pressure.mitigationCount, lifecycle: pressure.lifecycle, pierced: pressure.lifecycle === 'BROKEN' } as never,
  } as never);
  const risk = Math.abs(d.E - d.SL);
  const reward = Math.abs(d.TP - d.E);
  const RRR = risk > 0 ? reward / risk : 0;
  const chainDays = (chain?.dayByDay ?? chain?.chain ?? []).map((x) => ({ day: x.day, shape: String(x.shape) }));
  const dayIndex = Math.max(0, chainDays.findIndex((x) => normalizeDayKey(x.day) === day));
  const chainContext = `shape-chain ${chain?.currentShape ?? shape} day ${dayIndex + 1}/${Math.max(1, chainDays.length)}`;
  const setupId = `${pair}|${day}|${shape}|${d.direction}|${d.e1ZoneId}`;
  const tokenLedger: TokenResult[] = [
    { token: 'zone-identification', deterministic: true, verdict: ledger.t1.verdict, evidence: [ledger.t1.zoneId] },
    { token: 'pressure-status', deterministic: true, verdict: `${ledger.t2.side} ${pressure.lifecycle} score ${ledger.t2.score.toFixed(2)}`, evidence: [`mitigations ${ledger.t6.mitigations}`] },
    { token: 'liquidity', deterministic: true, verdict: `below ${ledger.t3.below} above ${ledger.t3.above}`, evidence: [] },
    { token: 'break-validation', deterministic: true, verdict: ledger.t4.breakVerdict, evidence: [] },
    { token: 'strength-comparison', deterministic: true, verdict: `${ledger.t5.stronger} delta ${ledger.t5.delta.toFixed(2)}`, evidence: [] },
    { token: 'reaction-count', deterministic: true, verdict: `mitigations ${ledger.t6.mitigations}`, evidence: [] },
    { token: 'chain-progress', deterministic: true, verdict: `${ledger.t7.stage} day ${dayIndex + 1}/${Math.max(1, chainDays.length)}`, evidence: [] },
    { token: 'forward-position', deterministic: false, verdict: `agent ${d.forwardPosition} pips`, evidence: [d.rationale], confidence: d.confidence },
    { token: 'anchors', deterministic: false, verdict: `E ${d.E} SL ${d.SL} TP ${d.TP}`, evidence: [`e1 ${d.e1ZoneId} e2 ${d.e2ProjectionId}`], confidence: d.confidence },
  ];
  const validation = token11_validation(
    {
      pair, day: normalizeDayKey(day), shape, direction: d.direction,
      E: d.E, SL: d.SL, TP: d.TP, RRR,
      setupId,
    } as unknown as TradeProjection,
    chainDays.map((x) => ({ day: normalizeDayKey(x.day), shape: x.shape })),
  );
  return {
    pair,
    day: normalizeDayKey(day),
    shape,
    direction: d.direction,
    entryZoneId: d.e1ZoneId,
    entryLqzId: undefined,
    E: d.E,
    SL: d.SL,
    TP: d.TP,
    RRR,
    pressureRead,
    chainContext,
    validation: { valid: validation.valid, warnings: validation.warnings, confidence: validation.confidence },
    confidence: d.confidence,
    source: 'NATIVE',
    e2ProjectionId: d.e2ProjectionId,
    e2DayDirection: d.direction,
    setupId,
    anchors: [
      { role: 'ENTRY', price: d.E, e1ZoneId: d.e1ZoneId, e2ProjectionId: d.e2ProjectionId, method: 'STEP-B' },
      { role: 'SL', price: d.SL, e1ZoneId: d.e1ZoneId, e2ProjectionId: d.e2ProjectionId, method: 'STEP-B' },
      { role: 'TP', price: d.TP, e1ZoneId: d.e1ZoneId, e2ProjectionId: d.e2ProjectionId, method: 'STEP-B' },
    ],
    tokenLedger,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE TOOL
// ═══════════════════════════════════════════════════════════════════════════

export function buildStepBTool(api: StepBToolContextApi): ReturnType<typeof tool> {
  const log = api.log;

  return tool({
    description:
      'STEP B (E2→E3): the 11-token reasoning chain. The machine presents its ' +
      'deterministic ledger (tokens 1-7 + 9) IN THIS RESULT; you perform the ' +
      'judgment tokens (T8 forward-position · T10 anchor construction · T11 ' +
      'validation) in your own context and emit ONLY the decisions[] (E/SL/TP + ' +
      'the anchors + the verdicts — NOT the full projections; the machine ' +
      'assembles them). The machine validates (the WARN set W-1..W-7 — a WARN ' +
      'continues the loop, it never hard-kills) and assembles the TradeProjections ' +
      '— the contracted input of plutus-pipeline-setups.',
    args: {
      weekStart: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('ISO Monday date for the target week (same weekStart as the whole chain).'),
      decisions: z
        .array(reasoningStepDecisionsSchema)
        .min(1)
        .describe('Your STEP B decisions — ONE per projection. The machine validates each against the WARN set and assembles the full TradeProjections.'),
    },
    async execute(args): Promise<ToolResult> {
      const ctx = api.ensureContext(args.weekStart);
      log.info(`STEP B START: weekStart=${args.weekStart}, ${args.decisions.length} decisions`);

      // ── THE PREREQUISITE (error path FIRST) ──
      if (!ctx.zoneMapSnapshot && !ctx.zonesByPair) {
        return {
          title: 'STEP B FAILED — no zone map',
          output: JSON.stringify({
            status: 'FATAL',
            error: 'No E1 zone map in the context. Call plutus-pipeline-zones first.',
            nextStep: 'Run harvest → zones → STEP A → shapes, then re-run STEP B with the decisions[] built from the ledger.',
          }),
        };
      }
      if (args.decisions.length === 0) {
        return {
          title: 'STEP B BLOCKED — empty decisions',
          output: JSON.stringify({
            status: 'BLOCKED',
            error: 'The decisions array is empty — the E3 needs at least ONE projection decision.',
          }),
        };
      }

      const pair = args.decisions[0]!.pair;
      const day = args.decisions[0]!.day;
      const component = `${pair} ${normalizeDayKey(day)} ${args.decisions[0]!.direction}`;

      // ── THE MACHINE'S LEDGER (tokens 1-7 + 9 + the CLOSED sets) ──
      const ledger = buildTokenLedger(ctx, pair, day);
      ctx.reasoningLedger = ledger;

      // ── THE WARN-SET VALIDATION (the D2 law — a WARN continues the loop).
      //    The REFIT WAVE'S validateAgentDecisions (shadow-agent.ts — the spec
      //    Part 2.5 W-1..W-7, the single source of truth) — NEVER re-implemented.
      const warnings: Array<{ decision: ReasoningStepDecisions; warns: RefinementWarning[] }> = [];
      for (const d of args.decisions) {
        const w = validateAgentDecisions(
          d as RefitReasoningStepDecisions,
          {
            continuationTargets: ledger.continuationTargets.map((t) => Number(t)),
            e1ZoneIds: ledger.e1ZoneIds,
            e2ProjectionIds: ledger.e2ProjectionIds,
          },
          d.direction,
        );
        warnings.push({ decision: d, warns: w });
      }
      const totalWarns = warnings.reduce((n, w) => n + w.warns.length, 0);

      // The GROUNDING_WARN rows → the failure store (the D2 audit trail). The
      // refine loop: count this component's prior GROUNDING_WARN rows — at
      // MAX_REFINEMENTS it becomes REFINEMENT_EXHAUSTED (data, never a crash).
      const priorWarns = failuresForWeek(args.weekStart).filter(
        (r) => r.reason === 'GROUNDING_WARN' && r.component === component,
      ).length;
      let exhausted = false;
      if (totalWarns > 0) {
        for (const { decision: d, warns } of warnings) {
          for (const w of warns) {
            const record = {
              component,
              context: { warn: w, decision: d, ledger },
              attempts: priorWarns + 1,
              week: args.weekStart,
              pair,
            };
            if (priorWarns + 1 > MAX_REFINEMENTS) {
              recordFailure({ ...record, reason: 'REFINEMENT_EXHAUSTED' as const });
              exhausted = true;
            } else {
              recordFailure({ ...record, reason: 'GROUNDING_WARN' as const });
            }
          }
        }
        log.info(`STEP B: ${totalWarns} WARN(s) recorded (component ${component}, attempt ${priorWarns + 1}/${MAX_REFINEMENTS}) — the loop continues (D2)`);
      }

      // ── THE ASSEMBLE (the machine builds the full TradeProjections) ──
      // Only WARN-clean decisions assemble into ctx.projections — a warned
      // decision stays in the agent's refinement loop (it must re-emit the
      // corrected values on the next turn). The contract assert (the E3-NEVER)
      // is the final mechanical gate — a violation is a CONTRACT_VIOLATION row,
      // never a crash.
      const projections: TradeProjection[] = [];
      const contractViolations: Array<{ setupId: string; error: string }> = [];
      for (const { decision: d, warns } of warnings) {
        if (warns.length > 0) continue; // the loop continues — the agent refines
        let proj: TradeProjection;
        try {
          proj = assembleProjection(d, ledger, ctx);
          assertProjectionContract(proj);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          contractViolations.push({ setupId: `${d.pair}|${normalizeDayKey(d.day)}|${d.direction}`, error: msg });
          recordFailure({
            component,
            reason: 'CONTRACT_VIOLATION',
            context: { error: msg, decision: d },
            attempts: priorWarns + 1,
            week: args.weekStart,
            pair,
          });
          continue;
        }
        projections.push(proj);
      }

      ctx.projections = projections.length > 0 ? projections : null;

      const status = exhausted
        ? 'REFINEMENT_EXHAUSTED'
        : totalWarns > 0 || contractViolations.length > 0
          ? 'success_with_warnings'
          : 'success';
      const title = `STEP B complete — ${projections.length} projections (${totalWarns} WARNs)`;

      log.info(`STEP B DONE: ${projections.length} projections assembled, ${totalWarns} WARNs, ${contractViolations.length} contract violations (${component})`);

      return {
        title,
        output: JSON.stringify({
          status,
          projections,
          ledger,
          warnings: warnings.map((w) => w.warns).flat(),
          contractViolations: contractViolations.length > 0 ? contractViolations : undefined,
          nextStep: 'AGENT REASONING STEP B done — call plutus-pipeline-setups with weekStart (the projections are in the context; the E3 resolves them — the E3-NEVER: every anchor traces to the E1 zone + the E2 projection).',
        }, null, 2),
      };
    },
  });
}
