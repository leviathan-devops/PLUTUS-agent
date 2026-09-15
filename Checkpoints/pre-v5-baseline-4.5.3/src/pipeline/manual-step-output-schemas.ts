/**
 * PLUTUS 4.0 Pipeline — Manual Step Output Zod Schemas
 *
 * Zod schemas that validate every manual step's output before the next
 * tool's BEFORE hook permits execution. These schemas are the mechanical
 * contract between the agent's inline reasoning and the pipeline's
 * structural integrity (BS-7).
 *
 * INTEGRATION: NEW FILE src/pipeline/manual-step-output-schemas.ts
 * Source: L2 Spec Section 6.4.1
 */

import { z } from 'zod';

/**
 * ZOD_PRECISION = 4 BECAUSE forex strikes are quoted to 4 decimal places
 * (e.g., EUR/USD 1.0850). DXY strikes are 2 decimal places but stored
 * at 4 for schema uniformity. Tighter precision would reject valid strikes;
 * looser precision would admit malformed input.
 */
export const ZOD_PRECISION = 4;

export const OptionsStrikeSchema = z.object({
  pair: z.string().min(3),
  strike: z.number().positive().max(200),
  notional: z.number().nonnegative(),
  notionalBillions: z.number().nonnegative(),
  bold: z.boolean(),
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const ManualStepAOutputSchema = z.object({
  optionsData: z.array(OptionsStrikeSchema).min(1),
  screenshotPath: z.string().min(1),
});

export const ManualStepBOutputSchema = z.object({
  zoneCountPerPair: z.record(z.string(), z.number().int().min(0)),
  nearestZonesPerPair: z.record(
    z.string(),
    z.object({
      above: z.array(z.string()).max(5),
      below: z.array(z.string()).max(5),
    }),
  ),
  mergedZoneIds: z.array(z.string()).default([]),
});

export const ManualStepCOutputSchema = z.object({
  dailyNarratives: z.array(
    z.object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      narrative: z.string().min(20),
    }),
  ),
  primaryDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conflictDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
});

export const VisualSDZoneSchema = z.object({
  pair: z.string().min(3),
  type: z.enum(['SUPPLY', 'DEMAND', 'LIQUIDITY']),
  top: z.number().positive(),
  bottom: z.number().positive(),
  timeframe: z.enum(['4H', '1H', '30m', '15m']),
  classification: z.enum(['BoM', 'MoM', 'BOSM', 'UNMITIGATED']),
  source: z.enum(['VLM_CONFIRMED', 'VLM_NEW', 'VLM_REJECTED']),
  confidence: z.number().min(0).max(100),
  mappedIPZoneName: z.string().optional(),
  ipZoneRef: z.string().optional(),
  reactionCount: z.number().int().min(0).default(0),
  liquidityScore: z.number().min(0).max(100).default(0),
});

export const ManualStepDOutputSchema = z.object({
  validatedZones: z.array(VisualSDZoneSchema).min(3),
  rejectedZoneReasons: z.array(
    z.object({
      ipZoneName: z.string(),
      reason: z.string(),
    }),
  ).default([]),
});
