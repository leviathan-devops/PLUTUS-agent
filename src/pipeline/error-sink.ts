/**
 * PLUTUS 4.0 Pipeline — Error Sink
 *
 * Centralized error recording and persistence. Errors must be both
 * in-memory (for the orchestrator) AND persisted (for audit). This
 * module handles both concerns.
 *
 * INTEGRATION: NEW FILE src/pipeline/error-sink.ts
 * Source: L2 Spec Section 6.10
 */

import type { PipelineError } from './types.js';
import { promises as fs } from 'node:fs';

/**
 * ERROR_FILE_PATH BECAUSE the pipeline contract requires a single,
 * canonical error artifact. The path is fixed so downstream consumers
 * (CI, audit, dashboard) always know where to look.
 */
export const ERROR_FILE_PATH = '/root/plutus/reports/pipeline-errors.json';

/**
 * ErrorSeverity BECAUSE only FATAL errors abort the pipeline. HIGH/MEDIUM
 * are recorded but do not block progression.
 */
export type ErrorSeverity = 'FATAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * recordPipelineError BECAUSE errors must be both in-memory (for the
 * orchestrator) AND persisted (for audit). This function does both.
 *
 * INTEGRATION: invoked from every tool body's catch block.
 */
export async function recordPipelineError(
  ctx: { errors: PipelineError[] },
  error: PipelineError,
): Promise<void> {
  ctx.errors.push(error);
  await persistErrors(ctx.errors);
}

async function persistErrors(errors: PipelineError[]): Promise<void> {
  await fs.mkdir('/root/plutus/reports', { recursive: true });
  await fs.writeFile(
    ERROR_FILE_PATH,
    JSON.stringify({
      generatedAt: Date.now(),
      fatalCount: errors.filter((e) => e.severity === 'FATAL').length,
      highCount: errors.filter((e) => (e as { severity: string }).severity === 'HIGH').length,
      errors,
    }, null, 2),
    'utf-8',
  );
}

/**
 * hasFatalError BECAUSE the orchestrator must abort if ANY FATAL error
 * has been recorded. This is the single source of truth for "should we
 * continue?".
 */
export function hasFatalError(errors: PipelineError[]): boolean {
  return errors.some((e) => e.severity === 'FATAL');
}
