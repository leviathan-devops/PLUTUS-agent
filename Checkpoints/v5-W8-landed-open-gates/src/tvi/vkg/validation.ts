// ═══════════════════════════════════════════════════════════════════
// VKG CATEGORY B: ZONE VALIDATION RULES — 25 nodes (B-001..B-025, spec §3.2)
// + V4.3 ANCHOR DOCTRINE — 6 nodes (B-026..B-031, PLUTUS_V4.3_BUILD_SPEC §9)
// Bullets are CANON (verbatim from spec / operator directive)
// ═══════════════════════════════════════════════════════════════════

import { existsSync } from 'node:fs';
import type { AgentState, ValidatedZone, VKGNode } from '../types.js';
import { GENERIC_EVIDENCE_PATTERNS } from '../types.js';

const isVerif = (s: AgentState) => s.task === 'zone_verification';
const mid = (z: ValidatedZone) => (z.top + z.bottom) / 2;
/** Pip size: DXY 2.00 points = 200 pips → 0.01; FX 0.020 = 200 pips → 0.0001. */
const pipSize = (pair: string) => (pair === 'DXY' ? 0.01 : 0.0001);
const widthPips = (z: ValidatedZone) => (z.top - z.bottom) / pipSize(z.pair);

/**
 * BoM body criteria (spec §3.2 B-014): body ≥ 65% of range AND body-to-wick ≥ 3.0.
 * Candle body data is Engine 1's domain — the harness's deterministic proxy is that
 * the agent's visual evidence must cite a body percentage ≥ 65%.
 */
function bomBodyCriteriaMet(z: ValidatedZone): boolean {
  return /body/i.test(z.visualEvidence) && /(?:6[5-9]|[7-9]\d|100)\s*%/.test(z.visualEvidence);
}

/** TP-target zones are depleted zones (reactionCount ≥ 3) — spec §3.2 B-015. */
function isTpTarget(z: ValidatedZone): boolean {
  return z.reactionCount >= 3;
}

/** All pair zones within `pips` of spot — spec §3.2 B-023 (cluster detection). */
export function allZonesWithinPips(zones: ValidatedZone[], spot: number, pips: number): boolean {
  return zones.length > 0 && zones.every((z) => Math.abs(mid(z) - spot) <= pips * pipSize(z.pair));
}

/** Exact duplicate: same pair + type + boundaries at full precision — spec §3.2 B-025. */
function isDuplicate(zone: ValidatedZone, existingZones: ValidatedZone[]): boolean {
  return existingZones.some(
    (e) => e !== zone && e.pair === zone.pair && e.type === zone.type && e.top === zone.top && e.bottom === zone.bottom,
  );
}

/** Evidence lacks rung/candle specificity (V4.3 B-030): no exact 3+ decimal price reference. */
function lacksRungSpecificity(evidence: string): boolean {
  return !/\d+\.\d{3,}/.test(evidence);
}

export const validationNodes: VKGNode[] = [
  {
    id: 'B-001',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.top <= s.zone.bottom,
    bullet: 'BLOCKED: zone top must be > bottom. Structure invalid.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-002',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.visualEvidence.length < 20,
    bullet: 'BLOCKED: visualEvidence < 20 chars. Describe the SPECIFIC pattern.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-003',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && !/\d+\.\d{3,}/.test(s.zone.visualEvidence),
    bullet: "BLOCKED: evidence needs exact price with 3+ decimals (e.g. 'at 1.1480').",
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-004',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) =>
      isVerif(s) &&
      s.zone !== undefined &&
      GENERIC_EVIDENCE_PATTERNS.some((p) => s.zone!.visualEvidence.toLowerCase() === p),
    bullet: 'BLOCKED: generic evidence. Name the candlestick pattern with prices.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-005',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && !existsSync(s.zone.sourceScreenshot),
    bullet: 'BLOCKED: screenshot file not found. Capture via tv_screenshot first.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-006',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.pair !== 'DXY' && Math.abs(mid(s.zone) - s.spot) > 0.020,
    bullet: 'BLOCKED: zone > 200 pips from spot. Too far to be actionable.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-007',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.pair === 'DXY' && Math.abs(mid(s.zone) - s.spot) > 2.00,
    bullet: 'BLOCKED: DXY zone > 2.00 points from spot.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-008',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && (s.zone.type as string) === 'IP',
    bullet: 'BLOCKED: IP zones are NOT entry zones. Only S/D and LQZ zones are entries.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-009',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.reactionCount === 0,
    bullet: 'Unmitigated zone (reactionCount=0) — highest priority entry.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'B-010',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.reactionCount >= 1 && s.zone.reactionCount <= 2,
    bullet: 'Mitigated zone (1-2x) — still valid but weaker reaction expected.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'B-011',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.reactionCount >= 3,
    bullet: 'WARN: depleted zone (3x+) — TP target only, not entry.',
    priority: 'warn',
    disclosure: 'always',
  },
  {
    id: 'B-012',
    category: 'validation',
    taskTypes: ['zone_verification'],
    timeframes: ['4H'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.timeframe === '4H' && (widthPips(s.zone) < 15 || widthPips(s.zone) > 40),
    bullet: 'WARN: 4H zone width outside 15-40 pips. Check zone boundaries.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'B-013',
    category: 'validation',
    taskTypes: ['zone_verification'],
    timeframes: ['1H'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.timeframe === '1H' && (widthPips(s.zone) < 8 || widthPips(s.zone) > 25),
    bullet: 'WARN: 1H zone width outside 8-25 pips.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'B-014',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.classification === 'BoM' && !bomBodyCriteriaMet(s.zone),
    bullet: 'WARN: BoM without body criteria (≥65% body, ≥3.0 body-to-wick). Verify.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'B-015',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.zone.liquidityScore < 5 && isTpTarget(s.zone),
    bullet: "WARN: liquidityScore < 5 — insufficient 'wood for the fire' for TP target.",
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'B-016',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && (s.zone.confidence < 0 || s.zone.confidence > 100),
    bullet: 'BLOCKED: confidence must be 0-100.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-017',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && !['4H', '1H', '30m', '15m'].includes(s.zone.timeframe),
    bullet: 'BLOCKED: timeframe must be 4H, 1H, 30m, or 15m.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-018',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && !['SUPPLY', 'DEMAND', 'LIQUIDITY'].includes(s.zone.type),
    bullet: 'BLOCKED: type must be SUPPLY, DEMAND, or LIQUIDITY.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-019',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && !['BoM', 'MoM', 'UNMITIGATED'].includes(s.zone.classification),
    bullet: 'BLOCKED: classification must be BoM, MoM, or UNMITIGATED.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-020',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && !s.zone.source.startsWith('VLM_CONFIRMED') && !s.zone.source.startsWith('VLM_NEW'),
    bullet: 'BLOCKED: source must be VLM_CONFIRMED or VLM_NEW.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-021',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.pairZones !== undefined && s.pairZones.length > 0 && s.pairZones.every((z) => z.type === 'SUPPLY'),
    bullet: 'WARN: only supply zones found — also look for demand below spot.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'B-022',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.pairZones !== undefined && s.pairZones.length > 0 && s.pairZones.every((z) => z.type === 'DEMAND'),
    bullet: 'WARN: only demand zones found — also look for supply above spot.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'B-023',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.pairZones !== undefined && allZonesWithinPips(s.pairZones, s.spot, 10),
    bullet: 'WARN: all zones within 10 pips of spot — spread across the range.',
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'B-024',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && (s.pairZones?.length ?? 0) < 3,
    bullet: 'BLOCKED: < 3 validated zones for pair. Minimum 3 required.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-025',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => isVerif(s) && s.zone !== undefined && s.pairZones !== undefined && isDuplicate(s.zone, s.pairZones),
    bullet: 'Duplicate zone (same type + entry at full precision). Keeping first.',
    priority: 'guide',
    disclosure: 'once-gate',
  },

  // ── V4.3 ANCHOR DOCTRINE (PLUTUS_V4.3_BUILD_SPEC §9 — SL at next LQZ rung) ──
  {
    id: 'B-026',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => s.task === 'zone_verification' && (s.slDistancePips ?? 0) > 36,
    bullet: 'BLOCKED: SL > 36 pips. Entry is wrong or rung too far — re-anchor.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'B-027',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => s.task === 'zone_verification' && (s.slDistancePips ?? 0) > 20 && (s.slDistancePips ?? 0) <= 36,
    bullet: 'WARN: SL 21-36p — next rung should usually be < 20 pips.',
    priority: 'warn',
    disclosure: 'always',
  },
  {
    id: 'B-028',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) =>
      s.task === 'zone_verification' &&
      s.tpIsBoM === false &&
      s.tpIsEarthFire === false &&
      (s.tpMomMitigationCount ?? Number.POSITIVE_INFINITY) > 1,
    bullet: 'WARN: TP should prefer UM BoM > Earth+Fire > MoM.',
    priority: 'warn',
    disclosure: 'always',
  },
  {
    id: 'B-029',
    category: 'validation',
    taskTypes: ['zone_identification'],
    condition: (s) => s.task === 'zone_identification' && (s.type ?? s.zone?.type) === 'LIQUIDITY',
    bullet: 'LQZ = 2+ of 3 candle types (sweep/long-wick/short-wick-consol) on one line.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'B-030',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => s.task === 'zone_verification' && s.zone !== undefined && lacksRungSpecificity(s.zone.visualEvidence),
    bullet: "Name the rung: '3 wicks at 101.190', 'sweep through 100.945 then reversal'.",
    priority: 'warn',
    disclosure: 'once-gate',
  },
  {
    id: 'B-031',
    category: 'validation',
    taskTypes: ['zone_verification'],
    condition: (s) => s.task === 'zone_verification',
    bullet: 'SL sits INSIDE the next LQZ rung, 2-5 pips from its near edge.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
];
