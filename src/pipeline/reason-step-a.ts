/**
 * REASON-STEP-A — plutus-pipeline-reason-step-a (the STEP A tool, E1→E2).
 * (PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC §2.2 + Phase 7 T-A.)
 *
 * THE CONTRACT: the agent READS the E1 zone map (the telescoped S/D · LQZ · OB
 * all-TF zones + the pressure states + the lexicon classes) and DESIGNATES the
 * zones the E2 shape chain will build on. The designation is the contracted
 * input of plutus-pipeline-shapes (the E2). This replaces the E2's blind
 * "curate top-20 by confluence" with the reasoning-informed designation (D8).
 *
 * THE FIREWALL (the T1 semantic + format layers — mechanical):
 *   layer 2  every designation.zoneId ∈ ctx.zoneMapSnapshot.zones
 *            (a fabricated zoneId → BLOCKED — the A4 test)
 *   layer 3  every designation.rationale ≥ 40 chars ∧ has a price reference
 *            (a generic rationale → BLOCKED — the A4b test)
 *
 * THE OUTPUT: the designation stored in ctx.stepADesignation + the NEXT
 * instruction (call plutus-pipeline-shapes — the E2 consumes the designation
 * from the context).
 *
 * SELF-CONTAINED: imports only the spec's contract types + the plugin runtime.
 * The context accessor is injected by the engine (buildStepATool({ensureContext,
 * log})) — NO runtime import from engine.ts (avoids the circular dependency).
 */

import { tool } from '@opencode-ai/plugin';
import type { ToolResult } from '@opencode-ai/plugin';
import type { Logger } from '../utils/logger.js';
import type { PipelineRunContext } from './engine.js';

const z = tool.schema;

// ═══════════════════════════════════════════════════════════════════════════
// THE STEP A CONTRACT (the spec Part 8 — the designation shape)
// ═══════════════════════════════════════════════════════════════════════════

/** The E1 → STEP A → E2 designation (the spec §2.2 + Part 8). */
export interface StepADesignation {
  /** The pair: 'DXY' | 'EUR/USD' | 'GBP/USD'. */
  pair: string;
  /** The day: 'Mon'..'Fri'. */
  day: string;
  /** The designated zone id — MUST exist in the E1 zone map (the firewall). */
  zoneId: string;
  /** The zone's element role. */
  role: 'SUPPLY' | 'DEMAND' | 'LQZ';
  /** The zone's classification. */
  classification: 'BoM' | 'MoM' | 'LQZ';
  /** The agent's visible reasoning — ≥40 chars ∧ a price reference (the firewall). */
  rationale: string;
  /** The lexicon-4 lifecycle state the agent read. */
  pressureRead: string;
}

/** The designation schema — the arg contract (the format layer at the boundary).
 *  Module-private: consumed only inside buildStepATool's args; not exported, so
 *  no named-zod-type portability annotation is required. */
const stepADesignationSchema = z
  .object({
    pair: z.string().describe("The pair: 'DXY' | 'EUR/USD' | 'GBP/USD'"),
    day: z.string().describe("The day: 'Mon'..'Fri'"),
    zoneId: z.string().describe('The E1 zone id (MUST exist in the zone map).'),
    role: z.enum(['SUPPLY', 'DEMAND', 'LQZ']),
    classification: z.enum(['BoM', 'MoM', 'LQZ']),
    rationale: z
      .string()
      .min(40)
      .regex(/\d+\.\d{3,}/, 'the rationale must contain a specific price reference (e.g. 1.14540)')
      .describe('The agent\'s visible reasoning — ≥40 chars with a price reference.'),
    pressureRead: z.string().describe('The pressure lifecycle state the agent read (VIRGIN/ACTIVE_x/DEPLETED/FORTRESS/BROKEN + the zfp).'),
  })
  .describe('One STEP A designation — the zone the E2 shape chain will build on for this pair/day.');

/** The injected engine API (the context accessor + the logger). */
export interface StepToolContextApi {
  ensureContext(weekStart: string): PipelineRunContext;
  log: Logger;
}

/**
 * THE STEP A TOOL FACTORY — built by the engine with the context accessor
 * injected (the T1 pattern: module-level context, shared across the chain).
 */
export function buildStepATool(api: StepToolContextApi): ReturnType<typeof tool> {
  const log = api.log;

  return tool({
    description:
      'STEP A (E1→E2): the agent reads the E1 zone map + the pressure states + ' +
      'the lexicon classes, then designates the zones the E2 shape chain will ' +
      'build on. The designation is the contracted input of plutus-pipeline-shapes. ' +
      'A fabricated zoneId or a generic rationale is BLOCKED mechanically.',
    args: {
      weekStart: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('ISO Monday date for the target week (same weekStart as harvest/zones).'),
      designation: z
        .array(stepADesignationSchema)
        .min(1)
        .describe('Your STEP A designation array — ONE designation per pair/day. The zoneId MUST be a real id from the zone map output; the rationale MUST be ≥40 chars with a specific price reference (e.g. "1.14540").'),
    },
    async execute(args): Promise<ToolResult> {
      const ctx = api.ensureContext(args.weekStart);
      log.info(`STEP A START: weekStart=${args.weekStart}, ${args.designation.length} designations`);

      // ── THE PREREQUISITE (error path FIRST — the machine never reasons on air) ──
      if (!ctx.zoneMapSnapshot || !ctx.zoneMapSnapshot.zones) {
        return {
          title: 'STEP A FAILED — no zone map',
          output: JSON.stringify({
            status: 'FATAL',
            error: 'No E1 zone map in the context. Call plutus-pipeline-zones first.',
            nextStep: 'Call plutus-pipeline-zones with weekStart, then re-run STEP A with the designation[] built from the returned zone map.',
          }),
        };
      }
      if (args.designation.length === 0) {
        return {
          title: 'STEP A BLOCKED — empty designation',
          output: JSON.stringify({
            status: 'BLOCKED',
            error: 'The designation array is empty — the E2 needs at least ONE designated zone per pair/day.',
          }),
        };
      }

      // ── THE MECHANICAL FIREWALL (the T1 semantic + format layers) ──
      const zoneIds = new Set<string>(ctx.zoneMapSnapshot.zones.map((z) => z.id));
      for (const d of args.designation) {
        // layer 2 — the semantic membership: the zoneId MUST be in the E1 map
        if (!zoneIds.has(d.zoneId)) {
          return {
            title: 'STEP A BLOCKED — fabricated zoneId',
            output: JSON.stringify({
              status: 'BLOCKED',
              error: `zoneId "${d.zoneId}" is NOT in the E1 zone map (${d.pair} ${d.day}). FABRICATED DATA IS BLOCKED. Use a REAL zone id from the zones output.`,
              hint: 'The zone map contains the ids: ' + [...zoneIds].slice(0, 20).join(', ') + (zoneIds.size > 20 ? ` ... (${zoneIds.size} total)` : ''),
            }),
          };
        }
        // layer 3 — the format: the rationale ≥ 40 chars ∧ a price reference
        if (d.rationale.length < 40 || !/\d+\.\d{3,}/.test(d.rationale)) {
          return {
            title: 'STEP A BLOCKED — generic rationale',
            output: JSON.stringify({
              status: 'BLOCKED',
              error: `The rationale for zone "${d.zoneId}" (${d.pair} ${d.day}) is too generic — it must be ≥40 characters AND cite a specific price level (e.g. "3-wick rejection from 1.14540 + 2X test"). Generic text is BLOCKED.`,
            }),
          };
        }
      }

      // ── THE CONTEXT WRITE (the STEP A output — the E2 consumes it) ──
      ctx.stepADesignation = args.designation;

      log.info(`STEP A DONE: ${args.designation.length} designations stored in the context`);

      return {
        title: `STEP A complete — ${args.designation.length} designations`,
        output: JSON.stringify({
          status: 'success',
          designation: args.designation,
          nextStep: 'AGENT REASONING STEP A done — call plutus-pipeline-shapes with weekStart (the designation is in the context; the E2 shape chain builds on the designated zones).',
        }, null, 2),
      };
    },
  });
}
