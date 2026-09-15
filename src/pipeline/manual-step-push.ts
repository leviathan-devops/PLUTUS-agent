/**
 * PLUTUS 4.0 Pipeline — Manual Step Push Builders
 *
 * Each builder constructs a ManualStepPush with structured instructions
 * the agent follows inline between tool calls. The orchestrator's
 * escalation tracker counts how many times the agent's next tool call
 * arrives WITHOUT the expectedArgPath populated; at OFF_TRACK_THRESHOLD
 * it re-pushes with escalated wording.
 *
 * INTEGRATION: NEW FILE src/pipeline/manual-step-push.ts
 * Source: L2 Spec Section 6.4
 */

import type { ManualStepPush } from './hooks.js';
import type { PhaseResult } from './types.js';

/**
 * buildManualStepAPush BECAUSE the agent's reasoning chain needs an
 * unambiguous, structured directive — not free text. Each bodyStep is
 * one atomic action the agent must perform.
 */
export function buildManualStepAPush(prev: PhaseResult<unknown>): ManualStepPush {
  const harvestData = prev.data as {
    optionsDateLink: { indexUrl: string; dateToken: string; hrefPattern: string; label: string; fridayIso: string };
  };
  return {
    stepId: 'A',
    priority: 'CRITICAL',
    heading: `MANUAL STEP A — Options Extraction (${harvestData.optionsDateLink.label})`,
    bodySteps: [
      `Call plutus-browse-screenshot with weekStart. It runs Protocol A ` +
        `(Orders index ${harvestData.optionsDateLink.indexUrl} → date link matching ` +
        `${harvestData.optionsDateLink.dateToken} in ${harvestData.optionsDateLink.hrefPattern} hrefs → ` +
        `table screenshot → VALID/INVALID firewall) and returns a verified screenshotPath, ` +
        `OR declares [NO DATA].`,
      `If the tool declares [NO DATA]: proceed to plutus-pipeline-zones with optionsData: [] ` +
        `(structural pillars only). [NO DATA] is a DECLARED OUTCOME — NEVER fabricate options ` +
        `data and NEVER substitute a different week.`,
      `If the tool returns screenshotPath: ANALYZE the screenshot DIRECTLY using your own ` +
        `visual capabilities (read() the file). Do NOT call any external API. You ARE the VLM. ` +
        `Do NOT run OCR yourself — the tool has built-in OCR.`,
      `For each row in the table, extract: pair (e.g. "EUR/USD"), strike price (number), ` +
        `notional in USD, bold flag (true if row is bolded).`,
      `Convert notional to notionalBillions = notional / 1_000_000_000.`,
      `Populate plutus-pipeline-zones args.optionsData with the extracted OptionsStrike[] array, ` +
        `setting sourceScreenshot to the returned screenshotPath in EVERY entry.`,
    ],
    outputContract:
      'args.optionsData: OptionsStrike[] — non-empty, validated against the schema. ' +
      'Each entry has pair, strike, notional, notionalBillions, bold, expiry, sourceScreenshot. ' +
      'OR empty array [] when Protocol A declared [NO DATA].',
    outputSchemaName: 'OptionsStrike',
    expectedArgPath: 'optionsData',
  };
}

/**
 * buildManualStepBPush BECAUSE the agent must review the zone map BEFORE
 * seeing any chart. Visual bias from chart-derived expectation is the
 * most common cause of false-positive zone rejection (observed in 3 of
 * 7 trial runs of the monolithic pipeline).
 */
export function buildManualStepBPush(prev: PhaseResult<unknown>): ManualStepPush {
  const zoneData = prev.data as { zones: unknown[]; spots: Record<string, number> };
  return {
    stepId: 'B',
    priority: 'CRITICAL',
    heading: 'MANUAL STEP B — Textual Zone Review (DO NOT consult chart)',
    bodySteps: [
      `Review the zone map as TEXT. For each DXY zone, state:` +
        ` (a) zone type, (b) floor/ceiling relative to DXY spot, (c) sdType (BoM/MoM),` +
        ` (d) confluence score, (e) reactionCount.`,
      `Count zones above spot (DXY resistance translated to forex support)` +
        ` and below spot (DXY support translated to forex resistance).`,
      `For each forex pair, identify the 3 nearest zones to current spot` +
        ` in each direction. These will be the validatedZones candidates.`,
      `Flag any zone whose floor/ceiling overlap another zone by > 70% as "merged" — ` +
        `the engine will deduplicate by highest confluence.`,
      `Confirm the zone count is ≥ 4 per pair and ≥ 16 total. If fewer, ` +
        `mark ManualStepB output as insufficient — the zones tool will rerun with deeper lookback.`,
    ],
    outputContract:
      'args.zoneReview: ManualStepBOutput — zoneCountPerPair, nearestZonesPerPair, mergedZoneIds.',
    outputSchemaName: 'ManualStepBOutput',
    expectedArgPath: 'zoneReview',
  };
}

export function buildManualStepCPush(prev: PhaseResult<unknown>): ManualStepPush {
  const shapeData = prev.data as { chain: Array<{ day: string; shape: string }> };
  return {
    stepId: 'C',
    priority: 'CRITICAL',
    heading: 'MANUAL STEP C — Shape Chain Review',
    bodySteps: [
      `For each day in the shape chain, narrate the expected price path:` +
        ` opening zone → mid-day behavior → closing zone.`,
      `Verify each day's shape code (SS/BS/WL/RWL/R/WLS/STORM/DWL) matches the prior day's close` +
        ` — a "Recovery (R)" day must follow a down-move; a "BS" must break the prior range.`,
      `Identify the day with the highest directional conviction. This day anchors the primary setup.`,
      `Mark any day whose shape conflicts with the zone map (e.g. SS on a day when spot opens` +
        ` inside a tight consolidation) for de-prioritization.`,
      `Confirm consolidationPhase and storylineBias are populated.`,
    ],
    outputContract:
      'args.shapeReview: ManualStepCOutput — dailyNarratives, primaryDay, conflictDays.',
    outputSchemaName: 'ManualStepCOutput',
    expectedArgPath: 'shapeReview',
  };
}

export function buildManualStepDPush(prev: PhaseResult<unknown>): ManualStepPush {
  const chartData = prev.data as { screenshots: Array<{ pair: string; timeframe: string; path: string }> };
  return {
    stepId: 'D',
    priority: 'CRITICAL',
    heading: `MANUAL STEP D — VLM Screenshot Analysis (${chartData.screenshots.length} screenshots)`,
    bodySteps: [
      `For each screenshot in args.screenshots, ANALYZE the image DIRECTLY` +
        ` using your own visual capabilities. Do NOT call any external API.`,
      `For each visible rectangle (Engine 1 zone overlay), verify it is anchored to one of:` +
        ` (a) an order block (last down-candle before a sustained up-move, or vice versa),` +
        ` (b) a wick cluster (≥3 wicks rejecting the same level within 10 bars),` +
        ` (c) a fair value gap (imbalance between two consecutive candles of the same direction),` +
        ` (d) a tight consolidation (≥4 bars inside a 10-pip range).`,
      `For each verified zone, produce a VisualSDZone with source = 'VLM_CONFIRMED' ` +
        `(if it matches a zone drawn on the chart) or 'VLM_NEW' (if you found an institutional ` +
        `zone that was not drawn).`,
      `For zones drawn on the chart that do NOT match any candlestick pattern, produce a ` +
        `VisualSDZone with source = 'VLM_REJECTED' and confidence ≤ 30.`,
      `Require ≥ 3 VLM_CONFIRMED or VLM_NEW zones per pair (T17). Below this, the setups tool ` +
        `will throw a ManualStepMissingError with recovery instructions.`,
    ],
    outputContract:
      'args.validatedZones: VisualSDZone[] — non-empty per pair, ≥3 with source CONFIRMED or NEW.',
    outputSchemaName: 'VisualSDZone',
    expectedArgPath: 'validatedZones',
  };
}
