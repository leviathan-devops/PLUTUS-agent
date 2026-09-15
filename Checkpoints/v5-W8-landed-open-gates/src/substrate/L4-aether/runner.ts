// src/shadow/runner.ts — the 13-step ONE-PLACE composition (spec §5.5/§6.7.5)
// Never scatter the stages — one runner holds the composition. Any step failure
// ⇒ the LOUD error manifest {ready:false, error named, NO file, NO memory row}.

import { tetherSession, registerSidecar, touchSidecar, handleSessionSwitch, verifyMemoryReattach, type ReattachVerdict } from './sidecar';
import { ShadowMemory, type ShadowMemoryEvent } from './memory';
import { streamWithBrain, BrainBreaker, type ModelSeam } from './brain';
import { buildContext, buildBrief, injectSlots, silentVerify, type ChainTurn } from './tools';

export interface ShadowPipelineInput {
  readonly project: string;
  readonly sessionKey: string;
  readonly spec: { readonly skeleton: string; readonly requiredSections: readonly string[] };
  readonly sessionStream: readonly ChainTurn[];
  readonly slots: { filepaths: readonly string[]; context: Readonly<Record<string, string>> };
  readonly memoryRoot: string;
  readonly memoryRootExists: () => boolean;
}

export type ShadowPipelineResult =
  | { ready: true; content: string; outputPath: string; seq: number; stalledMs: number }
  | { ready: false; error: { stage: string; code: string; detail?: string }; outputPath?: undefined };

export interface ShadowPipelineDeps {
  readonly model: ModelSeam;
  readonly now?: () => number;
  readonly writeOutput?: (path: string, content: string) => void;
  readonly outputPathFor?: (project: string, sessionKey: string) => string;
}

/** runShadowPipeline — THE 13-STEP composition, one place. */
export async function runShadowPipeline(input: ShadowPipelineInput, deps: ShadowPipelineDeps): Promise<ShadowPipelineResult> {
  const now = deps.now ?? ((): number => Date.now());
  const outputPath = (deps.outputPathFor ?? ((p, s): string => `${deps === undefined ? '' : ''}/tmp/paragon-shadow/${p}/${s}/output.md`))(input.project, input.sessionKey);

  // 1 TETHER — the 3-tier session tether
  const tether = tetherSession({ sessionKey: input.sessionKey, projectId: input.project });

  // 2 SIDECAR register
  registerSidecar(tether.pid, tether.sessionKey, tether.projectId);

  // 3 MEMORY open
  const memory = new ShadowMemory(input.memoryRoot, input.project, tether.sessionKey);

  // 4 REATTACH GATE — the 3-check gate; a fail is LOUD (no silent adopt)
  const reattach: ReattachVerdict = verifyMemoryReattach(tether.pid, tether.sessionKey, input.memoryRootExists);
  if (!reattach.ok) {
    memory.close();
    return { ready: false, error: { stage: 'MEMORY.REATTACH', code: `MEMORY_REATTACH_FAILED:${reattach.condition}` } };
  }

  // 5 TOUCH (liveness)
  touchSidecar(tether.pid);

  // 6 VALIDATE — the spec skeleton must be non-empty with slots
  if (input.spec.skeleton.trim().length === 0) {
    memory.close();
    return { ready: false, error: { stage: 'VALIDATE', code: 'SPEC_SKELETON_EMPTY' } };
  }

  // 7 CONTEXT — the chain window + [SHADOW INFERENCE]
  const built = buildContext(input.sessionStream, memory.epochSummary());

  // 8 WEAVE — the §9 single source slot injection
  const woven = injectSlots(input.spec.skeleton, input.slots);

  // 9 BRIEF — supremacy → inference → weave (NEVER reordered)
  const brief = buildBrief({ inference: built.inference, weave: woven });

  // 10 BRAIN — the frozen-model call (errors ENCODED; stall detection; breaker)
  const breaker = new BrainBreaker();
  const brainResult = await streamWithBrain(deps.model, { system: SUPREMACY_AS_SYSTEM, prompt: brief }, breaker);
  if (!brainResult.ok) {
    memory.close();
    // THE LOUD MANIFEST: NO file, NO memory row — never a fabricated success
    return { ready: false, error: { stage: 'BRAIN.STREAM', code: brainResult.code, detail: brainResult.breakerOpen ? 'breaker open after 3 strikes' : undefined } };
  }

  // 11 VERIFY — silent verification; flags INSIDE the result; mechanical repair
  const verified = silentVerify(brainResult.content, { requiredSections: input.spec.requiredSections, mustQuote: [] });

  // 12 PERSIST — memory row + the output file (side effects BEFORE the claim)
  const ev: ShadowMemoryEvent = {
    sessionKey: tether.sessionKey, role: 'shadow',
    content: verified.repairedText ?? brainResult.content,
    atUnixMs: now(), epoch: memory.epochSummary().epoch,
  };
  const seq = memory.appendPrompt(ev);
  deps.writeOutput?.(outputPath, verified.repairedText ?? brainResult.content);

  // 13 SESSION SWITCH bookkeeping + close
  handleSessionSwitch(tether.pid, tether.sessionKey);
  memory.close();

  return {
    ready: true,
    content: verified.repairedText ?? brainResult.content,
    outputPath,
    seq,
    stalledMs: brainResult.stallDetected ? 1 : 0,
  };
}

const SUPREMACY_AS_SYSTEM = 'You are the PARAGON shadow compose stage. THE FILES ARE THE ONLY GROUND TRUTH.';
