// ═══════════════════════════════════════════════════════════════════
// VKG CATEGORY D: ANTI-PATTERN DETECTION — 15 nodes (D-001..D-015)
// PLUTUS_TVI_DESIGN_SPEC §3.4 — bullets are CANON (verbatim)
// ═══════════════════════════════════════════════════════════════════

import { existsSync } from 'node:fs';
import type { AgentState, ValidatedZone, VKGNode } from '../types.js';
import { GENERIC_EVIDENCE_PATTERNS } from '../types.js';
import { allZonesWithinPips } from './validation.js';

const isId = (s: AgentState) => s.task === 'zone_identification';
const isVerif = (s: AgentState) => s.task === 'zone_verification';

/**
 * Visible candle evidence (spec §3.4 D-004): the deterministic harness proxy is
 * specific evidence (≥20 chars, exact price reference, not generic) backed by an
 * existing source screenshot.
 */
function hasVisibleCandleEvidence(zone: ValidatedZone): boolean {
  return (
    zone.visualEvidence.length >= 20 &&
    /\d+\.\d{3,}/.test(zone.visualEvidence) &&
    !GENERIC_EVIDENCE_PATTERNS.some((p) => zone.visualEvidence.toLowerCase() === p) &&
    existsSync(zone.sourceScreenshot)
  );
}

/** Generic evidence exact-match (spec §3.4 D-011). */
function isGenericEvidence(evidence: string): boolean {
  return GENERIC_EVIDENCE_PATTERNS.some((p) => evidence.toLowerCase() === p);
}

/** All zones on the same side (spec §3.4 D-009). */
function allZonesSameSide(zones: ValidatedZone[]): boolean {
  return (
    zones.length > 0 &&
    (zones.every((z) => z.type === 'SUPPLY') || zones.every((z) => z.type === 'DEMAND'))
  );
}

export const antiPatternNodes: VKGNode[] = [
  {
    id: 'D-001',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && !s.agentHasReadScreenshot,
    bullet: 'BLOCKED: read() the screenshot first — then produce ZONE| lines.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'D-002',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && s.agentComputedInsteadOfSeeing === true,
    bullet: 'WARN: you computed zones instead of seeing them. Read the chart.',
    priority: 'warn',
    disclosure: 'always',
  },
  {
    id: 'D-003',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && (s.screenshotAge ?? 0) > 300_000,
    bullet: 'WARN: screenshot is > 5 minutes old. Re-capture for fresh data.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'D-004',
    category: 'anti_pattern',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && !hasVisibleCandleEvidence(s.zone),
    bullet: 'BLOCKED: zone has no visible candlestick evidence on chart.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'D-005',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && s.agentOnlyConfirmedRectangles === true,
    bullet: 'WARN: you confirmed rectangles without reading candle structure. Look deeper.',
    priority: 'warn',
    disclosure: 'always',
  },
  {
    id: 'D-006',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && s.zoneBoundariesNotFromPriceAxis === true,
    bullet: "BLOCKED: zone boundaries must come from the chart's price axis numbers.",
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'D-007',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && s.agentTriedToReadBase64 === true,
    bullet: 'BLOCKED: read() the .png file — base64 text is not an image.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'D-008',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && s.agentCalledOmniVision === true,
    bullet: 'BLOCKED: use read() directly — omni-vision is for VIDEO only.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'D-009',
    category: 'anti_pattern',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.pairZones !== undefined && allZonesSameSide(s.pairZones),
    bullet: 'WARN: only one side identified. Look for both supply AND demand.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'D-010',
    category: 'anti_pattern',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.pairZones !== undefined && allZonesWithinPips(s.pairZones, s.spot, 10),
    bullet: 'WARN: zones clustered near spot. Spread across the visible range.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'D-011',
    category: 'anti_pattern',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && isGenericEvidence(s.zone.visualEvidence),
    bullet: 'BLOCKED: generic evidence. Name the EXACT pattern with EXACT prices.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'D-012',
    category: 'anti_pattern',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && (s.pairZones?.length ?? 0) === 0,
    bullet: 'BLOCKED: zero zones identified for pair. Read the chart and identify zones.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'D-013',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && s.timeframe !== '4H',
    bullet: 'WARN: use 4H chart for zone identification. 4H shows institutional structure.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'D-014',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && s.identifiedAnyLqz === false,
    bullet: 'WARN: no liquidity zones identified. Look for stop hunts (long wicks).',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'D-015',
    category: 'anti_pattern',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s) && s.zone !== undefined && s.zone.pair !== s.pair,
    bullet: "BLOCKED: zone pair doesn't match screenshot pair.",
    priority: 'block',
    disclosure: 'always',
  },
];
