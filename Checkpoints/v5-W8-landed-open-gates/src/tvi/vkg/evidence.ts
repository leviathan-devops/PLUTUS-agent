// ═══════════════════════════════════════════════════════════════════
// VKG CATEGORY C: VISUAL EVIDENCE REQUIREMENTS — 15 nodes (C-001..C-015)
// PLUTUS_TVI_DESIGN_SPEC §3.3 — bullets are CANON (verbatim)
// ═══════════════════════════════════════════════════════════════════

import type { AgentState, VKGNode } from '../types.js';
import { GENERIC_EVIDENCE_PATTERNS } from '../types.js';

const isId = (s: AgentState) => s.task === 'zone_identification';

/**
 * Vague evidence (spec §3.3 C-008): too short, generic exact-match, or missing
 * an exact price reference (3+ decimals).
 */
function isVagueEvidence(evidence: string): boolean {
  return (
    evidence.length < 20 ||
    GENERIC_EVIDENCE_PATTERNS.some((p) => evidence.toLowerCase() === p) ||
    !/\d+\.\d{3,}/.test(evidence)
  );
}

export const evidenceNodes: VKGNode[] = [
  {
    id: 'C-001',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'Engulfing = current candle body completely engulfs prior. 47% of winning entries.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-002',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'Pin bar = long wick rejecting zone. 32% of winning entries.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-003',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'Inside bar = small candle contained in prior. 21% of winning entries.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-004',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'Breakout candle = strong close beyond structure. 16% of winning entries.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-005',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: "Reference candle position: '3rd from right', 'large bearish at 14:00'.",
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-006',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: "Map zone boundaries to chart's price axis (right side numbers).",
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-007',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: "Combo evidence: 'engulfing + 3-wick rejection from 1.1480 supply'.",
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-008',
    category: 'evidence',
    taskTypes: ['zone_verification'],
    condition: (s) => s.task === 'zone_verification' && s.zone !== undefined && isVagueEvidence(s.zone.visualEvidence),
    bullet: 'BLOCKED: vague evidence. Name the EXACT pattern with EXACT prices.',
    priority: 'block',
    disclosure: 'always',
  },
  {
    id: 'C-009',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'Wick rejection = price probed and pushed back. Body = sustained direction.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-010',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'Unmitigated proof: no candle has entered the zone since formation.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-011',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'Sweep confirmed: wick beyond level + sharp reversal ≥15 pips in 3 bars.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-012',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'Consolidation edges: aligned wick tips at same level within 2 pips.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-013',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'OB origin: candle BEFORE the sharp move. Mark its high/low.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-014',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: 'BoS confirmed: price broke structure (higher high or lower low).',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'C-015',
    category: 'evidence',
    taskTypes: ['zone_identification'],
    condition: (s) => isId(s),
    bullet: "Count rejections: '3 consecutive upper wicks from 1.1500' = strong supply.",
    priority: 'guide',
    disclosure: 'once-gate',
  },
];
