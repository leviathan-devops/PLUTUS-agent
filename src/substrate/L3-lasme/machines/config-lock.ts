// src/machines/config-lock.ts — the CTX-family pair-test machine (spec §6.3.3)
// ct-anti-derailment.ts:848 lineage. Regexes CANDIDATE (the pair scan); the
// classifier DECIDES; INCONCLUSIVE → BLOCK (fail-closed). The substrate's own
// config surface is protected by the total cost asymmetry: a false BLOCK costs
// one retry with a named remedy; a false ALLOW costs the integrity thesis.

export type CtFamilyId =
  | 'CTX-01' | 'CTX-02' | 'CTX-03' | 'CTX-04' | 'CTX-05' | 'CTX-06' | 'CTX-07'
  | 'CTX-08' | 'CTX-09' | 'CTX-10' | 'CTX-11' | 'CTX-12' | 'CTX-13' | 'CTX-14';

/** CT_WARHEAD_REMEDIES — the single-source remedy table (CTX-01..08 per the canon). */
export const CT_WARHEAD_REMEDIES: Readonly<Record<string, string>> = {
  'CTX-01': 'Config writes are banned — the substrate config is immutable; propose the change via the enforcement matrix, never the file',
  'CTX-02': 'Read the config with the read-only member set (cat/yq -r); the write verbs are blocked',
  'CTX-03': 'Decode data to a scratch path, never the substrate tree',
  'CTX-04': 'Use the sanctioned warhead templates from CT_WARHEAD_REMEDIES, never hand-rolled',
  'CTX-05': 'Path writes go through the pipeline adapter; direct redirection is blocked',
  'CTX-06': 'Environment changes ride the profile, not the shell',
  'CTX-07': 'Lockfile mutations are registry operations, not file writes',
  'CTX-08': 'Secret writes are banned; use the secrets seam',
};

export interface CtExecVerdict {
  readonly action: 'ALLOW' | 'BLOCK';
  readonly family: CtFamilyId | 'CTX-READ' | 'CTX-UNRELATED';
  readonly source: 'CLASSIFIER' | 'INCONCLUSIVE';
  readonly remedy?: string;
  readonly evidence: string; // the matched span (the candidate the decision ran on)
}

/** The candidate scan — the DETECTION layer (regexes FLAG; never decide). */
const WRITE_PATTERN = /(^|&&|\|\||;|\s)(rm|mv|cp|tee|chmod|chown|dd|truncate|sed\s+-i|>\s*[^>&|]+|>>)\b/;
const READ_VERBS = new Set(['cat', 'head', 'tail', 'grep', 'ls', 'wc', 'stat', 'file', 'find', 'sort', 'uniq', 'yq']);

/** The named constant (LAW-16) — the printable-ratio decode detector. */
export const CT_DECODE_PRINTABLE_RATIO = 0.6; // BECAUSE: base64/hex payloads measure <0.6 printable-word ratio; prose measures >0.6 (calibrated in the ct canon)

/**
 * classifyCtExec — the DECISION layer. Per-subcommand classification (the
 * compound-command law: each segment classifies alone; the write half blocks,
 * the read half never poisoned).
 */
export function classifyCtExec(tool: string, args: { command?: string } | undefined, substratePaths: readonly string[] = []): CtExecVerdict {
  if (tool !== 'bash') return { action: 'ALLOW', family: 'CTX-UNRELATED', source: 'CLASSIFIER', evidence: '(non-bash tool)' };
  const command = args?.command ?? '';
  if (command === '') return { action: 'ALLOW', family: 'CTX-UNRELATED', source: 'CLASSIFIER', evidence: '(empty command)' };

  // INCONCLUSIVE on unparseable/binary input → BLOCK (fail-closed, never pass-through)
  if (/[\u0000-\u0008\u000E-\u001F]/.test(command)) {
    return { action: 'BLOCK', family: 'CTX-14', source: 'INCONCLUSIVE', remedy: CT_WARHEAD_REMEDIES['CTX-01'], evidence: '(binary command)' };
  }

  // segment the compound command; classify each segment independently
  const segments = command.split(/(?:&&|\|\||;|\|)/).map((s) => s.trim()).filter((s) => s.length > 0);
  for (const seg of segments) {
    const v = classifySegment(seg, substratePaths);
    if (v.action === 'BLOCK') return v;
  }
  // all segments passed: the strongest pass is the read/unrelated result
  return { action: 'ALLOW', family: 'CTX-UNRELATED', source: 'CLASSIFIER', evidence: bounded(command) };
}

function classifySegment(seg: string, substratePaths: readonly string[]): CtExecVerdict {
  // the read-verb member-set governance (CLR-8): reads with sanctioned verbs ALLOW
  const firstWord = seg.split(/\s+/)[0] ?? '';
  const isRead = READ_VERBS.has(firstWord) && !WRITE_PATTERN.test(seg);
  const touchesSubstrate = substratePaths.some((p) => seg.includes(p));

  // decode-data scan (CLR-7): base64/hex blobs carried toward writes
  const decoded = looksDecoded(seg);
  if (decoded && touchesSubstrate) {
    return { action: 'BLOCK', family: 'CTX-03', source: 'CLASSIFIER', remedy: CT_WARHEAD_REMEDIES['CTX-03'], evidence: bounded(seg) };
  }
  if (decoded && WRITE_PATTERN.test(seg)) {
    return { action: 'BLOCK', family: 'CTX-03', source: 'CLASSIFIER', remedy: CT_WARHEAD_REMEDIES['CTX-03'], evidence: bounded(seg) };
  }

  // the write test: a write operator on a substrate path blocks (CTX-01)
  if (WRITE_PATTERN.test(seg) && touchesSubstrate) {
    return { action: 'BLOCK', family: 'CTX-01', source: 'CLASSIFIER', remedy: CT_WARHEAD_REMEDIES['CTX-01'], evidence: bounded(seg) };
  }

  // the read/write pair: a write op with a read verb present classifies per-half
  if (WRITE_PATTERN.test(seg) && !isRead) {
    // a write NOT touching the substrate: allowed for project files (the substrate
    // is the protected surface; project files are the agent's work surface)
    return { action: 'ALLOW', family: 'CTX-UNRELATED', source: 'CLASSIFIER', evidence: bounded(seg) };
  }
  if (isRead) {
    return { action: 'ALLOW', family: 'CTX-02', source: 'CLASSIFIER', evidence: bounded(seg) };
  }
  // exec-family commands touching the substrate (node -e writing, docker exec >>)
  if (/(node|bun|python|docker)\b/.test(firstWord) && touchesSubstrate) {
    return { action: 'BLOCK', family: 'CTX-05', source: 'CLASSIFIER', remedy: CT_WARHEAD_REMEDIES['CTX-05'], evidence: bounded(seg) };
  }
  return { action: 'ALLOW', family: 'CTX-UNRELATED', source: 'CLASSIFIER', evidence: bounded(seg) };
}

function looksDecoded(seg: string): boolean {
  // the printable-ratio heuristic over long token runs (the NAMED constant + BECAUSE)
  const tokens = seg.split(/\s+/).filter((t) => t.length > 24);
  if (tokens.length === 0) return false;
  let printable = 0;
  let total = 0;
  for (const t of tokens) {
    for (const ch of t) {
      total += 1;
      if (/[A-Za-z0-9+/=]/.test(ch)) printable += 1;
    }
  }
  if (total === 0) return false;
  return printable / total > CT_DECODE_PRINTABLE_RATIO && /[A-Za-z0-9+/]{20,}={0,2}/.test(seg);
}

function bounded(s: string): string {
  return s.length <= 120 ? s : `${s.slice(0, 100)}[…${s.length}]`;
}

/** The block message builder — PSE-embedded (the triad rides the remedy). */
export function buildCtConfigLockMessage(v: CtExecVerdict): string {
  const remedy = v.remedy ?? 'Use the sanctioned path for this operation class';
  return `[CTX BLOCK] family=${v.family} source=${v.source} evidence="${v.evidence}" — REMEDY: ${remedy}`;
}
