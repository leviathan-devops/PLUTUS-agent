// src/compiler/rule-cards.ts — D13 quote-gated rule extraction (spec §4.4.2)
// v4.4.3 lexicon/rule-card.ts:248-268 lineage. Doctrine is QUOTED verbatim with
// anchors, never synthesized; the declared-metadata override REQUIRES the quote.

import type { ProvenanceAnchor } from '../L1-math';
import { contentId } from '../L1-math';
import type { SpecDocument } from './parser';
import { anchorFor } from './parser';

export type TemplateFamilyId = 'WIRING' | 'CONTRACT' | 'PROVENANCE' | 'DOMAIN' | 'PROCESS';

export interface RuleCard {
  readonly cardId: string; // sha256(quote + anchor) — the D13 verbatim gate
  readonly quote: string; // VERBATIM — "anything that can't be quoted doesn't get built"
  readonly anchor: ProvenanceAnchor;
  readonly classificationVote: {
    readonly mechanical: ClassEstimate;
    readonly declared?: DeclaredMetadata; // THE OVERRIDE — curated wins, quote REQUIRED
  };
  readonly templateFamilyHints: readonly TemplateFamilyId[];
}

export interface ClassEstimate {
  readonly familyVotes: Readonly<Record<TemplateFamilyId, number>>; // the VOTE, never the decision
  readonly winner: TemplateFamilyId;
}

export interface DeclaredMetadata {
  readonly family: TemplateFamilyId;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly declaredBy: string;
  readonly declarationAnchor: ProvenanceAnchor;
}

export class D13QuoteMismatchError extends Error {
  readonly code = 'D13_QUOTE_MISMATCH';
  constructor(public readonly cardId: string) {
    super(`D13_QUOTE_MISMATCH: ${cardId} — the quote cannot be re-found at its anchor; a declaration without a verbatim quote cannot override`);
  }
}

/** The family keyword vocabulary (the VOTE basis — detection only). */
const FAMILY_TERMS: Readonly<Record<TemplateFamilyId, readonly string[]>> = {
  WIRING: ['wire', 'wiring', 'hook', 'import', 'export', 'consumer', 'module', 'dead'],
  CONTRACT: ['must', 'interface', 'implement', 'contract', 'signature', 'shape'],
  PROVENANCE: ['source', 'trace', 'derive', 'origin', 'provenance', 'anchor', 'quote'],
  DOMAIN: ['threshold', 'numeric', 'count', 'limit', 'bound', 'range', 'ratio'],
  PROCESS: ['gate', 'audit', 'phase', 'order', 'stage', 'advance', 'workflow', 'measure'],
};

/** extractRuleCards — blockquotes + rule-shaped lines become D13-gated cards. */
export function extractRuleCards(doc: SpecDocument): readonly RuleCard[] {
  const cards: RuleCard[] = [];
  doc.lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const isQuote = /^\s*>\s?/.test(line);
    const isRuleShaped = /\b(NEVER|MUST|ALWAYS|FORBIDDEN|BANNED|REQUIRED|SHALL)\b/i.test(line);
    if (!isQuote && !isRuleShaped) return;
    const quote = line.replace(/^\s*>\s?/, '').trim();
    if (quote.length < 8) return; // noise floor: not a rule
    const anchor = anchorFor(doc, { kind: 'MATH', line: lineNo, raw: line }, quote);
    // BUG-5 fix: card ids hash over CONTENT (quote + line), never the filename —
    // the same corpus at two paths is the SAME battery (the determinism law)
    const cardId = contentId(quote, String(anchor.line)).slice(0, 16);
    // the mechanical classification VOTE (never the decision)
    const votes = voteFamily(quote);
    const declared = parseDeclaredMetadata(doc, lineNo);
    cards.push({
      cardId,
      quote,
      anchor,
      classificationVote: { mechanical: votes, declared },
      templateFamilyHints: declared ? [declared.family] : [votes.winner],
    });
  });
  return cards;
}

function voteFamily(quote: string): ClassEstimate {
  const lower = quote.toLowerCase();
  const votes: Record<TemplateFamilyId, number> = { WIRING: 0, CONTRACT: 0, PROVENANCE: 0, DOMAIN: 0, PROCESS: 0 };
  for (const [family, terms] of Object.entries(FAMILY_TERMS) as [TemplateFamilyId, string[]][]) {
    for (const t of terms) if (lower.includes(t)) votes[family] += 1;
  }
  let winner: TemplateFamilyId = 'PROCESS';
  let max = -1;
  for (const [f, v] of Object.entries(votes) as [TemplateFamilyId, number][]) {
    if (v > max) { max = v; winner = f; }
  }
  return { familyVotes: votes, winner };
}

/** parseDeclaredMetadata — `classification: FAMILY severity: X` inline declarations. */
function parseDeclaredMetadata(doc: SpecDocument, lineNo: number): DeclaredMetadata | undefined {
  // the declared line must be within the same blockquote run (the quote-backed override)
  const nearby = doc.lines.slice(Math.max(0, lineNo - 1), lineNo + 2).join(' ');
  const m = /classification:\s*(WIRING|CONTRACT|PROVENANCE|DOMAIN|PROCESS)\s+severity:\s*(CRITICAL|HIGH|MEDIUM|LOW)/i.exec(nearby);
  if (m === null) return undefined;
  const quoteLine = doc.lines[lineNo - 1]?.trim() ?? '';
  if (quoteLine.length < 8) return undefined; // the override requires the quote
  return {
    family: m[1]!.toUpperCase() as TemplateFamilyId,
    severity: m[2]!.toUpperCase() as DeclaredMetadata['severity'],
    declaredBy: 'spec-declaration',
    declarationAnchor: { source: doc.path.split('/').pop() ?? doc.path, line: lineNo, quote: quoteLine },
  };
}

/** validateCard — the D13 re-find gate: the quote MUST exist at its anchor. */
export function validateCard(card: RuleCard, doc: SpecDocument): void {
  const at = doc.lines[card.anchor.line - 1];
  if (at === undefined || !at.includes(card.quote.slice(0, Math.min(24, card.quote.length)))) {
    throw new D13QuoteMismatchError(card.cardId);
  }
}
