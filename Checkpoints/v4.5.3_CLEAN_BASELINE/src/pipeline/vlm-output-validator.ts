/**
 * PLUTUS 4.0 Pipeline — VLM Output Validator
 *
 * The agent's VLM analysis is opaque to the orchestrator — only the
 * OUTPUT is inspectable. This function enforces both schema correctness
 * AND the minimum-zone requirement.
 *
 * INTEGRATION: NEW FILE src/pipeline/vlm-output-validator.ts
 * Source: L2 Spec Section 6.8.1
 */

import { ManualStepDOutputSchema } from './manual-step-output-schemas.js';
import { ManualStepMissingError } from './hooks.js';
import type { ManualStepDescriptor } from './hooks.js';
import { MIN_VLM_ZONES_PER_PAIR } from './vlm-prompts.js';

/**
 * validateManualStepDOutput BECAUSE the agent's VLM analysis is opaque
 * to the orchestrator — only the OUTPUT is inspectable. This function
 * enforces both schema correctness AND the minimum-zone requirement.
 *
 * @param output - the agent's ManualStepDOutput
 * @param descriptor - the ManualStepD descriptor (for error recovery)
 * @param pair - pair label for the per-pair zone count check
 * @throws ManualStepMissingError if output is invalid or below minimum
 */
export function validateManualStepDOutput(
  output: unknown,
  descriptor: ManualStepDescriptor,
  pair: string,
): void {
  const parseResult = ManualStepDOutputSchema.safeParse(output);
  if (!parseResult.success) {
    throw new ManualStepMissingError('D', descriptor);
  }

  const zonesForPair = parseResult.data.validatedZones.filter(
    (z) => z.pair === pair && (z.source === 'VLM_CONFIRMED' || z.source === 'VLM_NEW'),
  );

  if (zonesForPair.length < MIN_VLM_ZONES_PER_PAIR) {
    throw new ManualStepMissingError('D', descriptor);
  }

  // Per-zone sanity check: top > bottom, confidence within bounds.
  for (const zone of parseResult.data.validatedZones) {
    if (zone.top <= zone.bottom) {
      throw new ManualStepMissingError('D', descriptor);
    }
    if (zone.source === 'VLM_REJECTED' && zone.confidence > 30) {
      throw new ManualStepMissingError('D', descriptor);
    }
  }
}
