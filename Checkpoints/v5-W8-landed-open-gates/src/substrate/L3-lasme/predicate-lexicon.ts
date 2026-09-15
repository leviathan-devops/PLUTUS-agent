// src/lasme/predicate-lexicon.ts — the typed member registry + scan (spec §4.3.3)
// THE DETECTOR/DECISION SPLIT (Law 4): matchers FLAG via structural Order-2 patterns;
// they carry NO verdict, NO score, NO decision. A bare RegExp is REJECTED at
// registration (type + runtime check) — the registry constructor is the wall.

import type { Order2Matcher, PatternFamilyMember, PatternFlag } from './contracts';
import { contentId, canonicalJson } from '../L1-math';

export class BareRegexRejectedError extends Error {
  readonly code = 'BARE_REGEX_REJECTED';
  constructor(public readonly memberId: string) {
    super(`BARE_REGEX_REJECTED: ${memberId} — matchers are Order-2 structural; a bare regex deciding is the ISE ban`);
  }
}
export class DuplicateMemberError extends Error {
  readonly code = 'DUPLICATE_MEMBER';
  constructor(public readonly memberId: string) {
    super(`DUPLICATE_MEMBER: ${memberId} already registered`);
  }
}
export class MissingExampleHitsError extends Error {
  readonly code = 'MISSING_EXAMPLE_HITS';
  constructor(public readonly memberId: string) {
    super(`MISSING_EXAMPLE_HITS: ${memberId} needs ≥1 positive AND ≥1 negative hit (the D17 seed)`);
  }
}

export class PredicateLexicon {
  private readonly members = new Map<string, PatternFamilyMember>();

  register(member: PatternFamilyMember): void {
    if (this.members.has(member.id)) throw new DuplicateMemberError(member.id);
    if ((member as unknown as { matcher: RegExp }).matcher instanceof RegExp)
      throw new BareRegexRejectedError(member.id);
    const hasPos = member.exampleHits.some((h) => h.shouldFlag);
    const hasNeg = member.exampleHits.some((h) => !h.shouldFlag);
    if (!hasPos || !hasNeg) throw new MissingExampleHitsError(member.id);
    this.members.set(member.id, member);
  }

  get(id: string): PatternFamilyMember | undefined {
    return this.members.get(id);
  }

  all(): readonly PatternFamilyMember[] {
    return [...this.members.values()];
  }

  /**
   * scan — the DETECTION LAYER ONLY. Compiles each member's structural patterns to
   * regexes INTERNALLY (the Order-2 token-class frames are regex-compiled but the
   * OUTPUT carries no verdict — the flag is a candidate for the machines).
   * Every member runs (NO first-match bias — the L6 lexicon law).
   */
  scan(text: string, anchor: { file: string; line: number } | null = null): readonly PatternFlag[] {
    const flags: PatternFlag[] = [];
    for (const m of this.members.values()) {
      if (matchesStructural(m.matcher, text)) {
        flags.push({
          memberId: m.id,
          excerpt: boundedSlice(text, 200),
          anchor,
        });
      }
    }
    return flags;
  }
}

/** The structural matcher: positive frame hits AND no negative-frame exclusion. */
function matchesStructural(matcher: Order2Matcher, text: string): boolean {
  for (const neg of matcher.negative) {
    if (frameToRegex(neg).test(text)) return false; // USE-frame exclusion wins
  }
  for (const pos of matcher.positive) {
    if (frameToRegex(pos).test(text)) return true;
  }
  return false;
}

/**
 * frameToRegex — compiles an Order-2 structural frame. Frames are word-boundary
 * token-class patterns (e.g. "pass branch", "default return true") — the structural
 * awareness is the frame VOCABULARY (registered, named, example-hit-seeded), not
 * the regex engine. The regex is the mechanical DETECTOR only (Warhead 9).
 */
const frameCache = new Map<string, RegExp>();
function frameToRegex(frame: string): RegExp {
  const hit = frameCache.get(frame);
  if (hit !== undefined) return hit;
  // BUG-4 fix: the FINAL token tolerates natural-language plurals ('branches'
  // matches 'branch') — the frame is the concept, the plural is the surface form.
  const toks = frame.split(/\s+/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const body = toks.map((t, i) => (i === toks.length - 1 ? `${t}(?:es|s)?` : t)).join('\\s+');
  const re = new RegExp(`\\b${body}\\b`, 'i');
  frameCache.set(frame, re);
  return re;
}

/** boundedSlice — the byte-budget discipline (Law 21): truncation is VISIBLE. */
export function boundedSlice(text: string, cap: number): string {
  if (text.length <= cap) return text;
  return `${text.slice(0, cap - 20)}[…TRUNCATED:${text.length}]`;
}

/** Content-addressed member id helper (registration-time determinism). */
export function memberIdOf(member: Omit<PatternFamilyMember, 'id'>): string {
  return contentId(member.kind, canonicalJson(member.matcher), member.severity, member.messageTemplate).slice(0, 16);
}

/** splitSentences — token-aware boundaries (code spans and abbreviations do not split). */
export function splitSentences(text: string): string[] {
  // Guard: code spans (balanced braces/parens with content) and common abbreviations
  // stay glued; naive period-splitting breaks code evidence.
  const protected_ = text
    .replace(/([A-Za-z])\.([A-Za-z])\b/g, '$1\u0001$2') // i.e. / e.g. / etc.
    .replace(/\{[^{}]*\}/g, (m) => m.replace(/\./g, '\u0001'))
    .replace(/\([^()]*\)/g, (m) => m.replace(/\./g, '\u0001'));
  return protected_
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.replace(/\u0001/g, '.').trim())
    .filter((s) => s.length > 0);
}
