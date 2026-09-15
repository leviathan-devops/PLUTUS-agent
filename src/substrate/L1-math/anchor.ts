// src/math/anchor.ts — the provenance anchor (spec §4.2.4, D13 quote-gated)
import type { MathExpr } from './expr';

/** Every rule, oracle, and finding traces to spec text — VERBATIM quote, never synthesized. */
export interface ProvenanceAnchor {
  readonly source: string; // corpus doc id (e.g. 'KB-02' | 'demo-spec.mpse.md')
  readonly line: number; // 1-indexed
  readonly quote: string; // VERBATIM — D13: "anything that can't be quoted doesn't get built"
}

/** Validate a card/rule against its anchor: the quote MUST be re-findable at the line. */
export function anchorQuoteMatches(anchor: ProvenanceAnchor, fileText: string): boolean {
  const lines = fileText.split('\n');
  const at = lines[anchor.line - 1];
  if (at === undefined) return false;
  return at.includes(anchor.quote.trim().slice(0, Math.min(40, anchor.quote.length)));
}

/** The expression tree's leaves that carry anchors (for provenance indexing). */
export function anchorsOf(_e: MathExpr): readonly ProvenanceAnchor[] {
  return []; // anchors ride the MathContract/SRuleCard, not every node — see contract.ts
}
