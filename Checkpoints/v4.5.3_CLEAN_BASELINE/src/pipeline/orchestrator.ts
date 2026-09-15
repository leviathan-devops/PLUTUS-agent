/**
 * PLUTUS 4.0 Pipeline — Orchestrator
 *
 * The orchestrator is the single entry point the opencode `tool`
 * registration exposes. The 5 individual tools are NOT independently
 * callable by the agent — the orchestrator sequences them and writes
 * pipeline-errors.json atomically at the end.
 *
 * INTEGRATION: NEW FILE src/pipeline/orchestrator.ts
 * Source: L2 Spec Section 2.6 (PlutusPipeline class) + Section 9.3 (runPipeline)
 */

import type { ToolSpec, ToolName } from './tools.js';
import { TOTAL_PIPELINE_TIMEOUT_MS } from './tools.js';
import type { PipelineContext, PhaseResult, PipelineError } from './types.js';
import type { ManualStepDescriptor } from './hooks.js';
import { ManualStepMissingError, OFF_TRACK_THRESHOLD, ESCALATION_THRESHOLD } from './hooks.js';
import { writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

/** Error output directory — derived from cwd to avoid hardcoded paths. */
const REPORT_DIR = join(process.cwd(), 'reports');
const ERRORS_TMP = join(REPORT_DIR, 'plutus-errors.json.tmp');
const ERRORS_FINAL = join(REPORT_DIR, 'plutus-errors.json');

/**
 * PlutusPipeline BECAUSE the orchestrator drives the 5-tool sequence,
 * catches errors, and persists artifacts. It prevents partial-state
 * leaks between runs.
 */
export class PlutusPipeline {
  constructor(
    private readonly tools: Record<ToolName, ToolSpec<unknown, unknown>>,
    private readonly now: () => number = Date.now,
    private readonly manualSteps: ManualStepDescriptor[] = [],
  ) {}

  async run(weekStart: string): Promise<{
    reportPath: string;
    errorsPath: string;
    setupCount: number;
    fatalCount: number;
  }> {
    const ctx: PipelineContext = {
      weekStart,
      temporalAnchor: this.computeAnchor(weekStart),
      pairList: ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'],
      phaseResults: {},
      manualStepOutputs: {},
      manualStepMissCount: { A: 0, B: 0, C: 0, D: 0 },
      errors: [],
      screenshots: [],
      validatedZones: [],
      startedAt: this.now(),
    };

    const order: ToolName[] = [
      'plutus-pipeline-harvest',
      'plutus-pipeline-zones',
      'plutus-pipeline-shapes',
      'plutus-pipeline-charts',
      'plutus-pipeline-setups',
    ];

    let lastResult: PhaseResult<unknown> | null = null;
    for (const toolName of order) {
      this.assertWithinTotalBudget(ctx);
      const tool = this.tools[toolName];
      if (!tool) {
        ctx.errors.push({
          stage: toolName, pair: 'ALL', severity: 'FATAL',
          message: `Tool ${toolName} not registered.`,
          context: { toolName }, timestamp: this.now(),
        });
        break;
      }

      // Run BEFORE hook (gating)
      try {
        tool.beforeHook?.({ weekStart } as never, ctx);
      } catch (e) {
        if (e instanceof ManualStepMissingError) {
          ctx.manualStepMissCount[e.stepId]++;
          ctx.errors.push({
            stage: toolName, pair: 'ALL', severity: 'FATAL',
            message: `Manual step ${e.stepId} missing (miss #${ctx.manualStepMissCount[e.stepId]}): ${e.message}`,
            context: { stepId: e.stepId, missCount: ctx.manualStepMissCount[e.stepId] },
            timestamp: this.now(),
          });
          if (ctx.manualStepMissCount[e.stepId] >= OFF_TRACK_THRESHOLD) {
            await this.persistErrors(ctx);
            throw e;
          }
          continue;
        }
        throw e;
      }

      // Run tool body with timeout
      const result = await this.runWithTimeout(tool, { weekStart } as never, ctx, tool.timeoutMs);
      ctx.phaseResults[toolName] = result;
      ctx.errors.push(...result.errors);
      lastResult = result;

      // Run AFTER hook (push manual step instructions)
      tool.afterHook?.(result, ctx);
      const stepForAfter = this.manualSteps.find((s) => s.occursAfterTool === toolName);
      if (stepForAfter) {
        this.escalateManualStep(stepForAfter, result);
      }

      // Propagate forward — pipeline halts on FATAL
      if (result.errors.some((e) => e.severity === 'FATAL')) {
        await this.persistErrors(ctx);
        throw new Error(`FATAL error in ${toolName}: ${result.errors.find((e) => e.severity === 'FATAL')!.message}`);
      }
    }

    await this.persistErrors(ctx);
    const setups = (lastResult?.data as { setups?: unknown[] })?.setups ?? [];
    return {
      reportPath: (lastResult?.data as { reportPath?: string })?.reportPath ?? '',
      errorsPath: ERRORS_FINAL,
      setupCount: setups.length,
      fatalCount: ctx.errors.filter((e) => e.severity === 'FATAL').length,
    };
  }

  /**
   * computeAnchor BECAUSE Friday 17:00 ET = anchor — forex weekly
   * options settle Friday 15:00 ET and the 17:00 close marks the
   * weekly bar.
   */
  private computeAnchor(weekStart: string): number {
    const t = new Date(weekStart + 'T00:00:00Z').getTime();
    return t + 4 * 86_400_000 + 17 * 3_600_000;
  }

  /**
   * assertWithinTotalBudget BECAUSE T14 requires total ≤ 5 minutes.
   */
  private assertWithinTotalBudget(ctx: PipelineContext): void {
    if (this.now() - ctx.startedAt > TOTAL_PIPELINE_TIMEOUT_MS) {
      throw new Error(
        `Total pipeline budget exceeded: ${this.now() - ctx.startedAt}ms > ${TOTAL_PIPELINE_TIMEOUT_MS}ms`,
      );
    }
  }

  /**
   * runWithTimeout BECAUSE each tool has a per-phase timeout. The
   * timeout wraps the body in Promise.race — a timeout rejection
   * produces a FATAL PipelineError.
   */
  private async runWithTimeout<TArgs, TData>(
    tool: ToolSpec<TArgs, TData>,
    args: TArgs,
    ctx: PipelineContext,
    timeoutMs: number,
  ): Promise<PhaseResult<TData>> {
    const timer = new Promise<PhaseResult<TData>>((_, reject) =>
      setTimeout(() => reject(new Error(`${tool.name} exceeded ${timeoutMs}ms`)), timeoutMs),
    );
    try {
      return await Promise.race([tool.body(args, ctx), timer]);
    } catch (e) {
      return {
        data: {} as TData,
        errors: [{
          stage: tool.name, pair: 'ALL', severity: 'FATAL',
          message: `Tool timeout or crash: ${(e as Error).message}`,
          context: { timeoutMs }, timestamp: this.now(),
        }],
        metadata: {},
      };
    }
  }

  /**
   * escalateManualStep BECAUSE the agent's instruction parser treats
   * pushed system messages with priority=CRITICAL as actionable
   * directives, not background context.
   */
  private escalateManualStep(
    step: ManualStepDescriptor,
    prev: PhaseResult<unknown>,
  ): void {
    const push = step.pushInstructions(prev);
    console.error(`[MANUAL_STEP_PUSH] ${JSON.stringify(push)}`);
  }

  /**
   * persistErrors BECAUSE pipeline-errors.json must be written atomically.
   * Partial writes corrupt the audit trail. We write to a temp file
   * then rename.
   */
  private async persistErrors(ctx: PipelineContext): Promise<void> {
    await writeFile(ERRORS_TMP, JSON.stringify({
      generatedAt: new Date(this.now()).toISOString(),
      weekStart: ctx.weekStart,
      temporalAnchor: new Date(ctx.temporalAnchor).toISOString(),
      fatalCount: ctx.errors.filter((e) => e.severity === 'FATAL').length,
      errors: ctx.errors,
      manualStepMissCount: ctx.manualStepMissCount,
      phaseStatus: Object.fromEntries(
        Object.entries(ctx.phaseResults).map(([k, v]) => [k, {
          ok: (v?.errors ?? []).every((e) => e.severity !== 'FATAL'),
          errorCount: v?.errors.length ?? 0,
        }]),
      ),
    }, null, 2), 'utf-8');
    await rename(ERRORS_TMP, ERRORS_FINAL);
  }
}

/**
 * runPipeline BECAUSE the 5 tools must be invoked in strict sequence
 * with manual steps interleaved. The orchestrator drives the sequence,
 * catches errors, and persists artifacts.
 *
 * Alternative entry point to PlutusPipeline class — accepts tools
 * as a parameter for flexibility.
 *
 * Source: L2 Spec Section 9.3
 */
export async function runPipeline(
  weekStart: string,
  tools: ToolSpec<unknown, unknown>[],
  agentInvoke: (prompt: string) => Promise<{ toolCall: { name: string; args: unknown } }>,
): Promise<{ setups: never[]; errors: PipelineError[]; durationMs: number }> {
  const start = Date.now();
  const ctx: PipelineContext = {
    weekStart,
    temporalAnchor: 0,
    pairList: ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'],
    phaseResults: {},
    manualStepOutputs: {},
    manualStepMissCount: { A: 0, B: 0, C: 0, D: 0 },
    errors: [],
    screenshots: [],
    validatedZones: [],
    startedAt: start,
  };

  for (const tool of tools) {
    if (ctx.errors.some((e) => e.severity === 'FATAL')) break;

    let attempt = 0;
    while (attempt < ESCALATION_THRESHOLD) {
      attempt++;
      try {
        const { toolCall } = await agentInvoke(
          `Invoke ${tool.name} for weekStart ${weekStart}. ` +
          `Manual step outputs so far: ${JSON.stringify(ctx.manualStepOutputs)}.`,
        );
        if (toolCall.name !== tool.name) {
          ctx.manualStepMissCount.A++;
          continue;
        }
        const result = await tool.body(toolCall.args, ctx);
        ctx.phaseResults[tool.name] = result;
        if (tool.name === 'plutus-pipeline-harvest' && (toolCall.args as { optionsData?: unknown }).optionsData) {
          ctx.manualStepOutputs.A = (toolCall.args as { optionsData: unknown }).optionsData;
        }
        tool.afterHook?.(result, ctx);
        break;
      } catch (err) {
        if (err instanceof ManualStepMissingError) {
          ctx.manualStepMissCount[err.stepId]++;
          if (ctx.manualStepMissCount[err.stepId] >= ESCALATION_THRESHOLD) {
            ctx.errors.push({
              stage: tool.name as PipelineError['stage'], pair: 'ALL', severity: 'FATAL',
              message: `[Orchestrator] Manual step ${err.stepId} missed ${ESCALATION_THRESHOLD} times. Aborting.`,
              context: { stepId: err.stepId }, timestamp: Date.now(),
            });
            break;
          }
          continue;
        }
        ctx.errors.push({
          stage: tool.name as PipelineError['stage'], pair: 'ALL', severity: 'FATAL',
          message: err instanceof Error ? err.message : String(err),
          context: { attempt }, timestamp: Date.now(),
        });
        break;
      }
    }
  }

  return { setups: [] as never[], errors: ctx.errors, durationMs: Date.now() - start };
}
