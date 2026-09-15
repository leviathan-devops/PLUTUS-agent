/**
 * GATE-TOOL — plutus-pipeline-gate (the W6 golden gate tool).
 * (PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC §2.1 + Phase 7 T-C.)
 *
 * THE FINAL TOOL OF THE D5 CHAIN: harvest → zones → STEP A → shapes →
 * STEP B → setups → gate. It runs the G1-G10 acceptance verdicts for the run
 * (via the W8 harness's runGoldenGate export — the harness reports the
 * missing-phase-output verdicts when the golden machinery hasn't landed; it
 * NEVER crashes, it reports — the spec's A-7 amendment) and calls resetContext()
 * at the chain's end (the T1 lifecycle — the next week starts fresh).
 *
 * THE T1 LIFECYCLE LAW: the LAST tool in the chain calls resetContext() to
 * clean up the module-level state (T1 §3.1). This tool is the last.
 *
 * SELF-CONTAINED: the context accessor + the resetter are injected by the
 * engine (buildGateTool({ensureContext, resetContext, log})).
 */

import { tool } from '@opencode-ai/plugin';
import type { ToolResult } from '@opencode-ai/plugin';
import type { Logger } from '../utils/logger.js';
import type { PipelineRunContext } from './engine.js';
import { runGoldenGate, type GateVerdict } from './golden-gate-harness.js';

const z = tool.schema;

/** The injected engine API — the context accessor + the resetter + the logger. */
export interface GateToolContextApi {
  ensureContext(weekStart: string): PipelineRunContext;
  resetContext(): void;
  log: Logger;
}

export function buildGateTool(api: GateToolContextApi): ReturnType<typeof tool> {
  const log = api.log;

  return tool({
    description:
      'The W6 golden gate: the G1-G10 acceptance verdicts for the run. ' +
      'The FINAL tool of the pipeline chain — after plutus-pipeline-setups. ' +
      'Runs the golden-gate harness (runGoldenGate), reports the verdicts, and ' +
      'resets the pipeline context (the next week starts fresh).',
    args: {
      weekStart: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('ISO Monday date for the target week (same weekStart as the whole chain).'),
    },
    async execute(args): Promise<ToolResult> {
      const ctx = api.ensureContext(args.weekStart);
      log.info(`gate START: weekStart=${args.weekStart}`);

      // ── THE G1-G10 VERDICTS (the W8 harness — reports missing-phase-output,
      //    never crashes — the spec's A-7 amendment) ──
      let verdicts: GateVerdict[];
      try {
        verdicts = runGoldenGate(ctx);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        log.info(`gate: runGoldenGate threw (reported as FAILED, never crashes): ${err}`);
        verdicts = (['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'] as const).map((gate) => ({
          gate,
          pass: false,
          detail: `missing-phase-output: runGoldenGate threw — ${err}`,
          evidence: 'the gate NEVER crashes, it reports (the A-7 amendment)',
        }));
      }

      const passed = verdicts.filter((v) => v.pass).length;
      log.info(`gate DONE: ${passed}/${verdicts.length} gates passed`);

      // ── THE T1 LIFECYCLE: resetContext() at the chain's end ──
      api.resetContext();
      log.info('gate: pipeline context RESET — the next week starts fresh (T1 lifecycle)');

      return {
        title: `Gate complete — ${passed}/${verdicts.length} passed`,
        output: JSON.stringify({
          status: verdicts.every((v) => v.pass) ? 'success' : 'FAILED',
          verdicts,
          passed,
          total: verdicts.length,
          note: 'The golden-oracle gates (G1-G4 · G7 · G10) report missing-phase-output until the W8 golden-gate wave lands their machinery; the mechanically-evaluable gates (G5 · G6 · G8 · G9) are real checks over this run.',
        }, null, 2),
      };
    },
  });
}
