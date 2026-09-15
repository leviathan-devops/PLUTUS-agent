// ═══════════════════════════════════════════════════════════════════
// VKG CATEGORY F: SHAPE-ZONE RELATIONSHIP — 5 nodes (F-001..F-005)
// PLUTUS_TVI_DESIGN_SPEC §3.6 — bullets are CANON (verbatim)
// ═══════════════════════════════════════════════════════════════════

import type { AgentState, VKGNode } from '../types.js';

/** Shape match against current or day shape (Engine 2). */
const shapeIs = (s: AgentState, shape: string) => s.currentShape === shape || s.dayShape === shape;

export const shapeNodes: VKGNode[] = [
  {
    id: 'F-001',
    category: 'shape',
    taskTypes: ['setup_generation'],
    condition: (s) => s.task === 'setup_generation' && shapeIs(s, 'SS'),
    bullet: 'SS = scalp at consolidation ceiling AND floor. Both boundaries valid.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'F-002',
    category: 'shape',
    taskTypes: ['setup_generation'],
    condition: (s) => s.task === 'setup_generation' && shapeIs(s, 'BS'),
    bullet: 'BS = entry at the FAILING zone (zfp > 45%). Breakout direction.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'F-003',
    category: 'shape',
    taskTypes: ['setup_generation'],
    condition: (s) => s.task === 'setup_generation' && shapeIs(s, 'WL'),
    bullet: 'WL = entry at Hard Wall (zfp < 20%). Rejection entry.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'F-004',
    category: 'shape',
    taskTypes: ['setup_generation'],
    condition: (s) => s.task === 'setup_generation' && shapeIs(s, 'RWL'),
    bullet: 'RWL = entry at Hard Wall in OPPOSITE direction of preceding BS.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
  {
    id: 'F-005',
    category: 'shape',
    taskTypes: ['setup_generation'],
    condition: (s) => s.task === 'setup_generation' && shapeIs(s, 'R'),
    bullet: 'R = entry at mid-range zone (zfp 20-40%). Recovery entry.',
    priority: 'guide',
    disclosure: 'once-gate',
  },
];
