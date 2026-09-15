// src/compiler/parser.ts — the MPSE spec document parser (spec §4.4.1)
// Fail-closed on unreadable/empty corpus — NEVER an empty battery dressed as success.

import type { MathExpr, OracleDeclaration, ProvenanceAnchor, ScalarValue } from '../L1-math';
import { canonicalJson, contentId } from '../L1-math';

export class CorpusUnreadableError extends Error {
  readonly code = 'CORPUS_UNREADABLE';
  constructor(public readonly path: string, public override readonly cause: string) {
    super(`CORPUS_UNREADABLE: ${path}: ${cause}`);
  }
}
export class CorpusEmptyError extends Error {
  readonly code = 'CORPUS_EMPTY';
  constructor(public readonly path: string) {
    super(`CORPUS_EMPTY: ${path} — a zero-extraction spec is an ERROR, distinct from a measured-clean battery`);
  }
}
export class OracleMissingError extends Error {
  readonly code = 'ORACLE_MISSING';
  constructor(public readonly oracleId: string) {
    super(`ORACLE_MISSING: ${oracleId} referenced but never declared — compile-time fail-closed`);
  }
}

export interface SpecBlock {
  readonly kind: 'MATH' | 'ORACLE' | 'CONTRACT' | 'PROFILE_REF';
  readonly line: number;
  readonly raw: string;
}

export interface SpecDocument {
  readonly specId: string;
  readonly path: string;
  readonly lines: readonly string[];
  readonly blocks: readonly SpecBlock[];
}

/**
 * parseSpec — reads the .mpse.md document and locates the fenced blocks.
 * The MPSE document format (§7.1.2): fenced ```math / ```oracle blocks with
 * one-expression-per-line JSON; blockquotes are the D13 quote source.
 */
export function parseSpec(path: string, text: string): SpecDocument {
  if (text === undefined || text === null) throw new CorpusUnreadableError(path, 'no content');
  const lines = text.split('\n');
  const blocks: SpecBlock[] = [];
  let current: { fence: string; startLine: number; body: string[] } | null = null;
  const setCurrent = (v: { fence: string; startLine: number; body: string[] } | null): void => {
    current = v;
  };

  lines.forEach((line, i) => {
    const fenceMatch = /^```(math|oracle|contract|profile)\s*$/.exec(line.trim());
    if (fenceMatch) {
      setCurrent({ fence: fenceMatch[1]!, startLine: i + 2, body: [] });
      return;
    }
    if (line.trim() === '```' && current !== null) {
      const c: { fence: string; startLine: number; body: string[] } = current;
      const kindMap: Record<string, SpecBlock['kind']> = {
        math: 'MATH', oracle: 'ORACLE', contract: 'CONTRACT', profile: 'PROFILE_REF',
      };
      blocks.push({ kind: kindMap[c.fence]!, line: c.startLine, raw: c.body.join('\n') });
      setCurrent(null);
      return;
    }
    if (current !== null) current.body.push(line);
  });
  if (current !== null) {
    const c: { fence: string; startLine: number; body: string[] } = current;
    throw new CorpusUnreadableError(path, `unterminated \`\`\`${c.fence} block starting line ${c.startLine}`);
  }
  const contentful = blocks.filter((b) => b.raw.trim().length > 0);
  if (contentful.length === 0) throw new CorpusEmptyError(path);
  return { specId: contentId(path, canonicalJson(contentful.map((b) => b.raw))).slice(0, 16), path, lines, blocks: contentful };
}

/** anchorFor — builds the D13 provenance anchor for a block (quote = the verbatim line). */
export function anchorFor(doc: SpecDocument, block: SpecBlock, quote: string): ProvenanceAnchor {
  return { source: doc.path.split('/').pop() ?? doc.path, line: block.line, quote };
}
