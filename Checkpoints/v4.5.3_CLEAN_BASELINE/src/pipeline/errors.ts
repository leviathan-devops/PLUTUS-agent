/**
 * PLUTUS 4.0 Pipeline — Error Classes
 *
 * The four sanctioned error classes for pipeline algorithms:
 *   - PipelineError (recoverable-but-recorded, defined in types.ts)
 *   - ManualStepMissingError (gate-blocks, defined in hooks.ts)
 *   - TemporalAnchorViolation (fatal abort)
 *   - CDPTimeoutError (chart retryable)
 *   - GUIInteractionError (GUI draw failure)
 *
 * INTEGRATION: NEW FILE src/pipeline/errors.ts
 * Source: L2 Spec Section 6.1 (Algorithm Contract)
 */

import type { PipelineError } from './types.js';

export class TemporalAnchorViolation extends Error {
  readonly anchor: number;
  readonly offendingTimestamp: number;
  readonly pair: string;

  constructor(anchor: number, offendingTimestamp: number, pair: string) {
    super(
      `[TemporalAnchor] pair=${pair} offendingTs=${offendingTimestamp} ` +
      `anchor=${anchor}. Future data leak detected at harvest boundary. ` +
      `This is a FATAL pipeline abort — no fallback.`,
    );
    this.name = 'TemporalAnchorViolation';
    this.anchor = anchor;
    this.offendingTimestamp = offendingTimestamp;
    this.pair = pair;
  }
}

export class CDPTimeoutError extends Error {
  readonly endpoint: string;
  readonly attempt: number;
  readonly maxAttempts: number;

  constructor(endpoint: string, attempt: number, maxAttempts: number) {
    super(
      `[CDPTimeout] endpoint=${endpoint} attempt=${attempt}/${maxAttempts}. ` +
      `Chrome CDP endpoint saturated. Retrying with dedicated instance.`,
    );
    this.name = 'CDPTimeoutError';
    this.endpoint = endpoint;
    this.attempt = attempt;
    this.maxAttempts = maxAttempts;
  }
}

export class GUIInteractionError extends Error {
  readonly tool: 'Rectangle' | 'Horizontal Line' | 'Long Position' | 'Short Position';
  readonly phase: 'flyout' | 'select' | 'click' | 'render';
  readonly coordinates?: { x: number; y: number };

  constructor(
    tool: GUIInteractionError['tool'],
    phase: GUIInteractionError['phase'],
    msg: string,
    coordinates?: { x: number; y: number },
  ) {
    super(`[GUIInteraction] tool=${tool} phase=${phase} ${msg}`);
    this.name = 'GUIInteractionError';
    this.tool = tool;
    this.phase = phase;
    this.coordinates = coordinates;
  }
}

/**
 * toPipelineError BECAUSE every non-PipelineError throw inside a tool body
 * must be normalized before being recorded in context.errors. Without this
 * normalization, a TemporalAnchorViolation would be silently swallowed by
 * the orchestrator's generic catch, producing a degraded report (the exact
 * failure mode BS-5 warns about).
 */
export function toPipelineError(
  err: unknown,
  stage: PipelineError['stage'],
  pair: string,
  context: Record<string, unknown> = {},
): PipelineError {
  if (err instanceof TemporalAnchorViolation) {
    return {
      stage,
      pair,
      severity: 'FATAL',
      message: err.message,
      context: { ...context, anchor: err.anchor, offendingTimestamp: err.offendingTimestamp },
      timestamp: Date.now(),
    };
  }
  if (err instanceof CDPTimeoutError) {
    return {
      stage,
      pair,
      severity: 'FATAL',
      message: err.message,
      context: { ...context, endpoint: err.endpoint, attempt: err.attempt },
      timestamp: Date.now(),
    };
  }
  if (err instanceof GUIInteractionError) {
    return {
      stage,
      pair,
      severity: 'FATAL',
      message: err.message,
      context: { ...context, tool: err.tool, phase: err.phase, coordinates: err.coordinates },
      timestamp: Date.now(),
    };
  }
  return {
    stage,
    pair,
    severity: 'FATAL',
    message: err instanceof Error ? err.message : String(err),
    context,
    timestamp: Date.now(),
  };
}
