/**
 * PLUTUS 4.0 Pipeline — Tool Specs, Schemas & Core Constants
 *
 * Declarative tool descriptions that let the Docker image register all
 * five tools from one array without per-tool wiring code.
 *
 * INTEGRATION: NEW FILE src/pipeline/tools.ts
 * Source: L2 Spec Section 2.3 (split: schemas/constants only — tool
 * bodies live in harvest-tool.ts, zones-tool.ts, etc.)
 */

import { z } from 'zod';
import type { PhaseResult, PipelineContext, ScreenshotArtifact, MacroCalendarEntry, ShapePredictionSnapshot, TradeSetup } from './types.js';
import type { ManualStepMissingError } from './hooks.js';
import type { OHLCBar, DXYZone } from '../types.js';

// Re-export types that are defined in types.ts but consumed via tools.ts
export type { PipelineContext, ScreenshotArtifact, MacroCalendarEntry } from './types.js';

// ─── Tool name union ───

export type ToolName =
  | 'plutus-pipeline-harvest'
  | 'plutus-pipeline-zones'
  | 'plutus-pipeline-shapes'
  | 'plutus-pipeline-charts'
  | 'plutus-pipeline-setups';

// ─── ToolSpec ───

/**
 * ToolSpec BECAUSE the orchestrator needs a single declarative
 * description per tool — name, arg schema, body, before-hook, after-hook.
 * Declarative form lets the Docker image register all five tools from
 * one array without per-tool wiring code.
 */
export interface ToolSpec<TArgs, TData> {
  name: ToolName;
  description: string;
  argSchema: z.ZodType<TArgs>;
  beforeHook?: (args: TArgs, ctx: PipelineContext) => void | ManualStepMissingError;
  body: (args: TArgs, ctx: PipelineContext) => Promise<PhaseResult<TData>>;
  afterHook?: (result: PhaseResult<TData>, ctx: PipelineContext) => void;
  timeoutMs: number;
}

// ─── Timeouts ───

/**
 * timeoutMs values BECAUSE each phase has empirically different ceilings:
 *  - harvest 60s: Chrome CDP Page.enable + multi-pair OHLC fetch.
 *  - zones 30s: pure CPU work over ~600 bars × 4 pairs.
 *  - shapes 20s: shape chain is O(days × shapes).
 *  - charts 120s: 4 pairs × 4 TFs × (draw + screenshot).
 *  - setups 30s: VisualSetupGenerator is bounded by validatedZones count.
 */
export const TOOL_TIMEOUTS = {
  'plutus-pipeline-harvest': 60_000,
  'plutus-pipeline-zones':   30_000,
  'plutus-pipeline-shapes':  20_000,
  'plutus-pipeline-charts': 120_000,
  'plutus-pipeline-setups':  30_000,
} as const;

/**
 * TOTAL_PIPELINE_TIMEOUT_MS = 300_000 BECAUSE T14 requires ≤5 minutes.
 * Sum of per-tool ceilings = 260s; the remaining 40s covers manual step
 * agent reasoning time (A+B+C+D ≈ 8-10s each).
 */
export const TOTAL_PIPELINE_TIMEOUT_MS = 300_000;

// ═══════════════════════════════════════════════════════════════════════════════
// Tool 1: plutus-pipeline-harvest — Zod schema + types
// ═══════════════════════════════════════════════════════════════════════════════

export const HarvestArgsSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pairs: z.array(z.string()).default(['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD']),
  lookbackDays: z.number().int().min(30).max(180).default(90),
});
export type HarvestArgs = z.infer<typeof HarvestArgsSchema>;

export interface HarvestOutput {
  ohlc: Record<string, OHLCBar[]>;
  macro: {
    spots: Record<string, number>;
    analystBias: Record<string, 'BULLISH' | 'BEARISH' | 'NEUTRAL'>;
    calendar: MacroCalendarEntry[];
  };
  /** Dynamic date link computed from weekStart — Manual Step A uses this. */
  optionsDateLink: {
    url: string;
    label: string;
    weekStartIso: string;
    fridayIso: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tool 2: plutus-pipeline-zones — Zod schema + types
// ═══════════════════════════════════════════════════════════════════════════════

export const ZonesArgsSchema = z.object({
  weekStart: z.string(),
  optionsData: z.object({
    strikes: z.array(z.object({
      pair: z.string(),
      strike: z.number(),
      notional: z.number(),
      notionalBillions: z.number(),
      bold: z.boolean(),
      expiry: z.string(),
    })),
    sourceScreenshot: z.string(),
    extractedBy: z.literal('AGENT_DIRECT_VISION'),
  }),
});
export type ZonesArgs = z.infer<typeof ZonesArgsSchema>;

export interface ZonesOutput {
  zones: DXYZone[];
  spots: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tool 3: plutus-pipeline-shapes — Zod schema + types
// ═══════════════════════════════════════════════════════════════════════════════

export const ShapesArgsSchema = z.object({
  weekStart: z.string(),
  zoneMapSnapshot: z.unknown(),
});
export type ShapesArgs = z.infer<typeof ShapesArgsSchema>;

export type ShapesOutput = ShapePredictionSnapshot;

// ═══════════════════════════════════════════════════════════════════════════════
// Tool 4: plutus-pipeline-charts — Zod schema + types
// ═══════════════════════════════════════════════════════════════════════════════

export const ChartsArgsSchema = z.object({
  weekStart: z.string(),
  validatedZones: z.array(z.object({
    pair: z.string(),
    type: z.enum(['SUPPLY', 'DEMAND', 'LIQUIDITY']),
    top: z.number(),
    bottom: z.number(),
    timeframe: z.string(),
    classification: z.enum(['BoM', 'MoM', 'BOSM', 'UNMITIGATED']),
    source: z.enum(['VLM_CONFIRMED', 'VLM_NEW', 'VLM_REJECTED']),
    confidence: z.number().min(0).max(100),
    reactionCount: z.number().int(),
    liquidityScore: z.number(),
  })),
});
export type ChartsArgs = z.infer<typeof ChartsArgsSchema>;

export interface ChartsOutput {
  screenshots: ScreenshotArtifact[];
  drawnZoneCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tool 5: plutus-pipeline-setups — Zod schema + types
// ═══════════════════════════════════════════════════════════════════════════════

export const SetupsArgsSchema = z.object({
  weekStart: z.string(),
  validatedZones: z.array(z.object({}).passthrough()),
  screenshots: z.array(z.object({ path: z.string() })),
});
export type SetupsArgs = z.infer<typeof SetupsArgsSchema>;

export interface SetupsOutput {
  setups: TradeSetup[];
  reportPath: string;
}
