// ═══════════════════════════════════════════════════════════════════
// VKG CATEGORY E: CONFLUENCE SCORING — 10 nodes (E-001..E-010)
// PLUTUS_TVI_DESIGN_SPEC §3.5 — bullets are CANON (verbatim)
// ═══════════════════════════════════════════════════════════════════

import type { AgentState, ValidatedZone, VKGNode } from '../types.js';

const hasZone = (s: AgentState) => s.zone !== undefined;
const mid = (z: ValidatedZone) => (z.top + z.bottom) / 2;
const pipSize = (pair: string) => (pair === 'DXY' ? 0.01 : 0.0001);

/** Earth+Fire: an S/D zone whose Engine 1 mapping is an LQZ overlap (spec §6.4 marks source with _LQZ). */
function isEarthFire(z: ValidatedZone): boolean {
  return (z.type === 'SUPPLY' || z.type === 'DEMAND') && (z.source.endsWith('_LQZ') || z.mappedIPZoneName.includes('LQZ'));
}

/** Count distinct timeframes with a zone overlapping `zone` within 3 pips of midpoint. */
function overlappingTimeframes(zone: ValidatedZone, pairZones: ValidatedZone[] | undefined): number {
  if (!pairZones) return 1;
  const tfs = new Set<string>([zone.timeframe]);
  for (const z of pairZones) {
    if (z === zone) continue;
    if (Math.abs(mid(z) - mid(zone)) <= 3 * pipSize(zone.pair)) tfs.add(z.timeframe);
  }
  return tfs.size;
}

export const confluenceNodes: VKGNode[] = [
  {
    id: 'E-001',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && isEarthFire(s.zone!),
    bullet: 'Earth+Fire: S/D zone overlapping LQZ = double reaction. TP at midpoint.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-002',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && s.zone!.mappedIPZoneName.length > 0,
    bullet: 'IP zone overlap with entry zone = +2 confluence. Tier 1 POI.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-003',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && overlappingTimeframes(s.zone!, s.pairZones) === 2,
    bullet: 'Dual-TF zone overlap = +3 confluence. Refined zones preferred.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-004',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && overlappingTimeframes(s.zone!, s.pairZones) >= 3,
    bullet: 'Triple-TF zone overlap = +5 confluence. Highest priority entry.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-005',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && s.zone!.liquidityScore < 5,
    bullet: "liquidityScore 0-10. TP zones need ≥5. 'Wood for the fire.'",
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-006',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && s.zone!.classification === 'BoM',
    bullet: 'BoM zone = +5 confidence bonus. Deepest institutional commitment.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-007',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && (s.zone!.source.startsWith('VLM_CONFIRMED') || s.zone!.source.startsWith('VLM_NEW')),
    bullet: 'VLM-sourced zone = +7 confidence. Visual confirmation > fallback.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-008',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && s.zone!.reactionCount === 0,
    bullet: 'Unmitigated zone = +10 freshness bonus. 100% reaction rate.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-009',
    category: 'confluence',
    taskTypes: ['zone_verification', 'setup_generation'],
    condition: (s) => hasZone(s) && s.zone!.reactionCount >= 3,
    bullet: '3x+ reactions = -5 penalty. Depleted zone.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'E-010',
    category: 'confluence',
    taskTypes: ['setup_generation'],
    condition: (s) => s.task === 'setup_generation' && s.pair !== 'DXY' && s.currentShape === s.dayShape,
    bullet: 'Cascade-aligned (DXY macro direction matches) = +10 for FX HTF swings.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
];
