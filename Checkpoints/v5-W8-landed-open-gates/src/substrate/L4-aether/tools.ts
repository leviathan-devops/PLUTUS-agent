// src/shadow/brief-builder.ts + slot-injector + context-manager + verify + pi-loop
// (spec §6.7.3-6.7.4) — the frozen supremacy contract, the §9 single source,
// the chain/[SHADOW INFERENCE], silent verification, the scoped READ-ONLY pi loop.

// ── brief-builder.ts ──────────────────────────────────────────────────

/** THE FROZEN SUPREMACY CONTRACT — one exported string, asserted-exact by tests. */
export const SUPREMACY_CONTRACT = `THE FILES ARE THE ONLY GROUND TRUTH. THE CONTEXT ARGS ARE BELIEF — VERIFY AGAINST THE FILES. Every claim you emit must carry a file:line anchor you actually read. An anchorless claim is a hallucination. Unknown values are PROPOSED, never invented. The operator's doctrine quotes are VERBATIM or marked as the paraphrase.`;

export const SUPREMACY_MARKER = '## SUPREMACY';
export const INFERENCE_MARKER = '## [SHADOW INFERENCE]';
export const WEAVE_MARKER = '## WEAVE';

export interface BriefInput {
  readonly inference: string;
  readonly weave: string;
}

/** buildBrief — the weave order is supremacy → inference → weave — NEVER reordered. */
export function buildBrief(input: BriefInput): string {
  return [
    SUPREMACY_MARKER,
    SUPREMACY_CONTRACT,
    '',
    INFERENCE_MARKER,
    input.inference,
    '',
    WEAVE_MARKER,
    input.weave,
  ].join('\n');
}

// ── slot-injector.ts (the §9 single source) ──────────────────────────

export interface SlotSource {
  readonly filepaths: readonly string[];
  readonly context: Readonly<Record<string, string>>;
}

/** slotValue — resolves a {{SLOT}} from the single source: filepaths → context → UNFILLED. */
export function slotValue(name: string, src: SlotSource): string {
  const fromCtx = src.context[name];
  if (fromCtx !== undefined) return fromCtx;
  // filepath slots resolve by naming convention (FILEPATH_1 → the first path)
  const m = /^FILEPATH_(\d+)$/.exec(name);
  if (m !== null) {
    const idx = Number(m[1]) - 1;
    const p = src.filepaths[idx];
    if (p !== undefined) return p;
  }
  return `<UNFILLED-WEAVE: ${name}>`; // VISIBLE — never a silent hole
}

/** injectSlots — replaces {{SLOT}} tokens; unfilled slots stay VISIBLE in the output. */
export function injectSlots(skeleton: string, src: SlotSource): string {
  return skeleton.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_all, name: string) => slotValue(name, src));
}

/** weave — fills the skeleton's slots with spec text (the composition surface). */
export function weave(skeleton: string, spec: Record<string, string>): string {
  return injectSlots(skeleton, { filepaths: [], context: spec });
}

// ── context-manager.ts (the chain + [SHADOW INFERENCE]) ──────────────

export const CHAIN_WINDOW = 30; // BECAUSE: the chain window covers a multi-wave session's context without rehydrating everything
export const CHAIN_LAST_N = 5;

export interface ChainTurn {
  readonly role: string;
  readonly content: string;
  readonly seq: number;
}

export interface BuiltContext {
  readonly chainUsed: readonly ChainTurn[];
  readonly inference: string;
}

/** buildContext — window-30 recent turns, last-5 verbatim, epoch summary + the inference. */
export function buildContext(turns: readonly ChainTurn[], epochSummary: { count: number; avgLines: number; epoch: number }): BuiltContext {
  const windowed = turns.slice(-CHAIN_WINDOW);
  const chainUsed = windowed.slice(-CHAIN_LAST_N); // the last-5 verbatim
  const older = windowed.slice(0, Math.max(0, windowed.length - CHAIN_LAST_N));
  const inference = [
    '## [SHADOW INFERENCE]',
    `- session epoch ${epochSummary.epoch}: ${epochSummary.count} events, avg ${epochSummary.avgLines} lines`,
    older.length > 0
      ? `- ${older.length} prior turns summarized (seq ${older[0]!.seq}–${older[older.length - 1]!.seq}); last ${chainUsed.length} verbatim`
      : '- no prior turns; first epoch',
  ].join('\n');
  return { chainUsed, inference };
}

// ── verify.ts (silent verification: flags INSIDE the output) ─────────

export interface VerifyResult {
  readonly flags: readonly string[];
  readonly verified: boolean;
  readonly repairedText?: string;
}

/** silentVerify — structure/verbatim/freshness flags ride INSIDE the result; mechanical repair. */
export function silentVerify(output: string, opts: { requiredSections: readonly string[]; mustQuote: readonly string[] }): VerifyResult {
  const flags: string[] = [];
  for (const s of opts.requiredSections) {
    if (!output.includes(s)) flags.push(`MISSING_SECTION:${s}`);
  }
  for (const q of opts.mustQuote) {
    if (!output.includes(q)) flags.push(`MISSING_QUOTE:${q.slice(0, 40)}`);
  }
  // mechanical repair: append the missing sections as explicit gaps (visible, never fabricated content)
  let repaired = output;
  for (const s of opts.requiredSections) {
    if (!output.includes(s)) repaired += `\n\n${s}\n(…section absent in generation — REPAIRED-GAP, content NOT fabricated)`;
  }
  return { flags, verified: flags.length === 0, repairedText: repaired === output ? undefined : repaired };
}

// ── pi-loop.ts (the scoped READ-ONLY legs) ───────────────────────────

export const READ_FILE_CAP = 8_000; // BECAUSE: covers a full large file read while bounding a runaway loop's memory
export const GREP_CAP = 120; // BECAUSE: the widest legitimate sweep without materializing unbounded output
export const PI_ROUNDS_CAP = 6; // BECAUSE: the observed verify-loop shape; round 7+ never produced new evidence

export type PiTool = 'read_file' | 'grep' | 'stat';

export class ReadOnlySurfaceError extends Error {
  readonly code = 'READ_ONLY_SURFACE';
  constructor() { super('READ_ONLY_SURFACE: the pi loop tool surface is read-only — write attempts are refused at the surface, not by policy'); }
}

/** piTools — the READ-ONLY surface; a `write` member is structurally absent. */
export const piTools: Readonly<Record<PiTool, (args: Readonly<Record<string, unknown>>) => unknown>> = Object.freeze({
  read_file: (args) => ({ path: args['path'], cap: READ_FILE_CAP }),
  grep: (args) => ({ pattern: args['pattern'], cap: GREP_CAP }),
  stat: (args) => ({ path: args['path'] }),
});

/** The [TOOL_CALL]/[TOOL_RESULT] wire format with BRACKET TOLERANCE (both [ and < open forms). */
export function parseToolCall(text: string): { tool: string; args: Record<string, unknown> } | null {
  // angle-bracket calls were silently never executed in the reference — tolerance is the fix.
  // BUG-9: nested JSON objects contain '}' — capture to the line's LAST '}' (greedy), not the first.
  const m = /(?:\[TOOL_CALL\]|<TOOL_CALL>)\s*(\{.*\})/.exec(text);
  if (m === null) return null;
  try {
    return JSON.parse(m[1]!) as { tool: string; args: Record<string, unknown> };
  } catch {
    return null;
  }
}

export function formatToolResult(result: unknown): string {
  return `[TOOL_RESULT] ${JSON.stringify(result)}`;
}
