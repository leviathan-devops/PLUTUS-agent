// ═══════════════════════════════════════════════════════════════════
// VKG NODE REGISTRY — combines all 6 categories (106 nodes)
// A: 30 identification | B: 25+6 validation | C: 15 evidence
// D: 15 anti_pattern | E: 10 confluence | F: 5 shape
// ═══════════════════════════════════════════════════════════════════

import type { VKGNode } from '../types.js';
import { identificationNodes } from './identification.js';
import { validationNodes } from './validation.js';
import { evidenceNodes } from './evidence.js';
import { antiPatternNodes } from './anti-pattern.js';
import { confluenceNodes } from './confluence.js';
import { shapeNodes } from './shape.js';

/** All VKG nodes — the deterministic knowledge base (spec §3, ~100 nodes + 6 V4.3). */
export const vkgNodes: VKGNode[] = [
  ...identificationNodes,
  ...validationNodes,
  ...evidenceNodes,
  ...antiPatternNodes,
  ...confluenceNodes,
  ...shapeNodes,
];

/** O(1) node lookup by id (spec §4.2 performance budget). */
export const nodesById: Map<string, VKGNode> = new Map(vkgNodes.map((n) => [n.id, n]));
