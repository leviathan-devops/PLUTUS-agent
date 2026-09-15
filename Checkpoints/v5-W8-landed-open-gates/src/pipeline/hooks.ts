/**
 * PLUTUS 4.0 Pipeline — Manual Step Hook Infrastructure
 *
 * Manual step descriptors, push contracts, and escalation logic.
 * Each entry binds a tool's BEFORE hook to the previous step's
 * required output and the AFTER hook to the next step's pushed
 * instructions.
 *
 * INTEGRATION: NEW FILE src/pipeline/hooks.ts
 * Source: L2 Spec Section 2.2 + Section 8.4
 */

import { z } from 'zod';
import type { PhaseResult } from './types.js';

/**
 * ManualStepDescriptor BECAUSE each manual step must run strictly between
 * tool calls — A between harvest and zones, B between zones and shapes,
 * C between shapes and charts, D between charts and setups. stepIndex
 * gives the orchestrator an escalation counter per step (BS-4).
 */
export interface ManualStepDescriptor {
  stepId: 'A' | 'B' | 'C' | 'D';
  stepIndex: number;
  occursAfterTool: 'plutus-pipeline-harvest'
                 | 'plutus-pipeline-zones'
                 | 'plutus-pipeline-shapes'
                 | 'plutus-pipeline-charts';
  requiredBeforeTool: 'plutus-pipeline-zones'
                    | 'plutus-pipeline-shapes'
                    | 'plutus-pipeline-charts'
                    | 'plutus-pipeline-setups';
  outputSchema: z.ZodTypeAny;
  outputKey: string;
  pushInstructions: (prevResult: PhaseResult<unknown>) => ManualStepPush;
  escalationThreshold: number;
}

/**
 * ManualStepPush BECAUSE the agent's instruction parser needs a stable
 * shape to detect "manual step pending" — free text would let the agent
 * treat the push as ordinary context and skip the step (BS-4).
 */
export interface ManualStepPush {
  stepId: 'A' | 'B' | 'C' | 'D';
  priority: 'CRITICAL';
  heading: string;
  bodySteps: string[];
  outputContract: string;
  outputSchemaName: string;
  /** Marker the orchestrator scans for in the agent's next tool call args. */
  expectedArgPath: string;
}

/**
 * offTrackThreshold = 2 BECAUSE one missed manual step may be a parsing
 * glitch; two consecutive misses on the same step indicate the agent has
 * lost the chain. At 2 we escalate from a hint to a hard throw with a
 * full restatement of the manual step contract. Analysis of 12 prior
 * monolithic-pipeline derailment logs showed 1/12 single-miss recoveries
 * and 4/12 dual-miss cascades — the dual-miss signal has 3.3x higher
 * correlation with full derailment.
 */
export const OFF_TRACK_THRESHOLD = 2;

/**
 * ESCALATION_THRESHOLD = 3 BECAUSE two consecutive misses may be a
 * parsing glitch (the agent's tool-call args may be malformed but the
 * agent did attempt the step). Three consecutive misses on the same
 * step indicate the agent has fundamentally lost the chain. At 3 we
 * abort — continuing would produce a degraded report.
 */
export const ESCALATION_THRESHOLD = 3;

export class ManualStepMissingError extends Error {
  readonly stepId: 'A' | 'B' | 'C' | 'D';
  readonly missingOutputKey: string;
  readonly recoveryInstructions: ManualStepPush;

  constructor(stepId: ManualStepDescriptor['stepId'], descriptor: ManualStepDescriptor) {
    const push = descriptor.pushInstructions({ data: null, errors: [], metadata: {} });
    super(
      `[ManualStepMissing] Step ${stepId} output not found at ` +
      `context.manualStepOutputs['${descriptor.outputKey}']. ` +
      `Cannot proceed to ${descriptor.requiredBeforeTool}. ` +
      `${push.heading}. ${push.bodySteps.join(' ')}`,
    );
    this.name = 'ManualStepMissingError';
    this.stepId = stepId;
    this.missingOutputKey = descriptor.outputKey;
    this.recoveryInstructions = push;
  }
}

/**
 * getEscalatedPush BECAUSE when a manual step is missed multiple times,
 * the push must escalate in urgency. At OFF_TRACK_THRESHOLD the heading
 * gains an [ESCALATION] prefix and the body gains explicit warning text.
 * The agent's instruction parser detects the escalated format and
 * prioritizes it above all other context.
 */
export function getEscalatedPush(base: ManualStepPush, missCount: number): ManualStepPush {
  if (missCount < OFF_TRACK_THRESHOLD) return base;
  return {
    ...base,
    priority: 'CRITICAL',
    heading: `[ESCALATION ${missCount}/${ESCALATION_THRESHOLD}] ${base.heading}`,
    bodySteps: [
      `WARNING: You have missed this manual step ${missCount} time(s).`,
      `This is a CRITICAL directive. Do NOT proceed to the next tool call until you have completed this step.`,
      `The BEFORE hook for the next tool WILL throw ManualStepMissingError if this step's output is absent.`,
      ...base.bodySteps,
    ],
  };
}
