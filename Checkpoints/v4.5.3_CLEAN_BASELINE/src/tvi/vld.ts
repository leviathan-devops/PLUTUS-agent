// ═══════════════════════════════════════════════════════════════════
// TVI — LOOP DETECTION (VLD)
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §10.1 (6 loop patterns, verbatim logic)
//
// Detects when the agent is stuck in a loop — producing the same
// output repeatedly without progress. Every check is DETERMINISTIC
// from VST state — zero model inference.
//
// Blocking policy: only checkBlindAct (VLD-5) throws — it complements
// VEB GATE P1 (MUST_READ_SCREENSHOT). All other checks warn and
// record an occurrence via vst.incrementLoopCount (spec §10.1).
// ═══════════════════════════════════════════════════════════════════

import type { TVIFinding } from './types.js';
import type { VisualStateTracker } from './vst.js';
import type { VisualGuidanceSystem } from './vgs.js';

/** VLD dependencies — the state tracker (queries) and guidance (bullets) */
export interface LoopDetectionDeps {
  vst: VisualStateTracker;
  vgs: VisualGuidanceSystem;
}

/**
 * Context for runAll() — the non-blocking sweep. Optional fields gate
 * which checks run; absent fields skip their check (a check must never
 * fire on missing data).
 */
export interface LoopCheckContext {
  /** VLD-1: screenshot the agent just read */
  screenshotPath?: string;
  /** VLD-1: timestamp of the last read of that screenshot */
  lastReadTimestamp?: number;
  /** VLD-3: tool the agent just called */
  toolName?: string;
  /** VLD-3: snippet of the tool's output/args (script-content probe) */
  toolOutput?: string;
  /** VLD-6: whether the pipeline has completed */
  pipelineComplete?: boolean;
  /** VLD-6: whether a report was generated */
  reportGenerated?: boolean;
}

/**
 * VLD-3 tool classes (spec §10.1 SCRIPT_LOOP). A shell/exec call is
 * always suspicious during zone identification; a file-writing call is
 * suspicious only when its content looks like a computation script
 * (python / script keywords per the spec's own detection expression).
 */
const SCRIPT_LOOP_ALWAYS_TOOLS: ReadonlySet<string> = new Set([
  'bash',
  'sh',
  'shell',
  'exec',
]);
const SCRIPT_LOOP_CONTENT_TOOLS: ReadonlySet<string> = new Set([
  'write',
  'edit',
]);
const SCRIPT_OUTPUT_HINT: RegExp = /python|script/i;

export class LoopDetection {
  private readonly vst: VisualStateTracker;
  private readonly vgs: VisualGuidanceSystem;

  constructor(deps: LoopDetectionDeps) {
    this.vst = deps.vst;
    this.vgs = deps.vgs;
  }

  // ─────────────────────────────────────────────────────────────────
  // VLD-1: STALE_READ — same screenshot read 3+ times, zero new zones
  // since the last read (spec §10.1 verbatim condition)
  // ─────────────────────────────────────────────────────────────────
  checkStaleRead(screenshotPath: string, lastReadTimestamp: number): TVIFinding | null {
    const readCount = this.vst.getImageReadCount(screenshotPath);
    const newZones = this.vst.getNewZoneCountSince(lastReadTimestamp);
    if (readCount >= 3 && newZones === 0) {
      const finding = this.vgs.warn(
        `STALE_READ: read ${screenshotPath} ${readCount}x, no new zones — move on or re-capture.`,
        {
          gate: 'VLD-1',
          antiPattern: true,
          reason: `imageReads=${readCount} >= 3 && newZonesSinceLastRead=${newZones} === 0`,
        },
      );
      this.vst.incrementLoopCount('STALE_READ');
      return finding;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // VLD-2: NO_VERIFY — zones produced but never verified (spec §10.1)
  // ─────────────────────────────────────────────────────────────────
  checkNoVerify(): TVIFinding | null {
    const produced = this.vst.getZoneProductionCount();
    const verified = this.vst.getZoneVerificationCount();
    if (produced > 0 && verified === 0) {
      const finding = this.vgs.warn(
        'NO_VERIFY: zones produced but not verified — check harness rejections.',
        {
          gate: 'VLD-2',
          antiPattern: true,
          reason: `zonesProduced=${produced} > 0 && zoneVerifications=${verified} === 0`,
        },
      );
      this.vst.incrementLoopCount('NO_VERIFY');
      return finding;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // VLD-3: SCRIPT_LOOP — agent reaches for bash/scripts to COMPUTE
  // zones instead of SEEING them (spec §10.1 detection expression:
  // bash always fires; write/edit fire only on python/script content)
  // ─────────────────────────────────────────────────────────────────
  checkToolUse(toolName: string, toolOutput?: string): TVIFinding | null {
    const name = (toolName ?? '').toLowerCase();
    const isShell = SCRIPT_LOOP_ALWAYS_TOOLS.has(name);
    const isScriptContent =
      SCRIPT_LOOP_CONTENT_TOOLS.has(name) &&
      typeof toolOutput === 'string' &&
      SCRIPT_OUTPUT_HINT.test(toolOutput);

    if (isShell || isScriptContent) {
      const finding = this.vgs.warn(
        "SCRIPT_LOOP: you're computing zones instead of seeing them. Read the chart.",
        {
          gate: 'VLD-3',
          antiPattern: true,
          reason: isShell
            ? `shell tool "${name}" called during visual zone identification`
            : `tool "${name}" produced script content (python/script hint)`,
        },
      );
      this.vst.incrementLoopCount('SCRIPT_LOOP');
      return finding;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // VLD-4: REPEAT_ERROR — same violation 3+ times (spec §10.1 uses
  // EVIDENCE_GENERIC as the canonical tracked error)
  // ─────────────────────────────────────────────────────────────────
  checkRepeatError(): TVIFinding | null {
    const errorCount = this.vst.getViolationCount('EVIDENCE_GENERIC');
    if (errorCount >= 3) {
      const finding = this.vgs.warn(
        `REPEAT_ERROR: ${errorCount} generic-evidence violations — name EXACT pattern + prices.`,
        {
          gate: 'VLD-4',
          antiPattern: true,
          reason: `EVIDENCE_GENERIC violations=${errorCount} >= 3`,
          warhead: 'evidence-guide',
        },
      );
      this.vst.incrementLoopCount('REPEAT_ERROR');
      return finding;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // VLD-5: BLIND_ACT — setups tool called with zero screenshots read.
  // THE ONLY BLOCKING VLD CHECK (spec §10.1: vgs.block). Complements
  // VEB GATE P1 — throws after recording so the tool call dies.
  // ─────────────────────────────────────────────────────────────────
  checkBlindAct(screenshotsRead: string[]): TVIFinding | null {
    if (!screenshotsRead || screenshotsRead.length === 0) {
      this.vgs.block("BLIND_ACT: you haven't read any screenshots. read() the PNG files first.", {
        gate: 'VLD-5',
        antiPattern: true,
        reason: `screenshotsRead.length=${screenshotsRead?.length ?? 0} === 0`,
      });
      this.vst.incrementLoopCount('BLIND_ACT');
      throw new Error(
        "[TVI] BLIND_ACT: you haven't read any screenshots. read() the PNG files first.",
      );
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // VLD-6: NO_REPORT — pipeline complete but no report generated
  // ─────────────────────────────────────────────────────────────────
  checkNoReport(pipelineComplete: boolean, reportGenerated: boolean): TVIFinding | null {
    if (pipelineComplete && !reportGenerated) {
      const finding = this.vgs.warn(
        'NO_REPORT: pipeline complete but no report generated. Call the report tool.',
        {
          gate: 'VLD-6',
          antiPattern: true,
          reason: 'pipelineComplete=true && reportGenerated=false',
        },
      );
      this.vst.incrementLoopCount('NO_REPORT');
      return finding;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────
  // runAll — non-blocking sweep. Runs every warn-priority check whose
  // context is present and returns all findings. checkBlindAct is
  // EXCLUDED: it is blocking and must be invoked from the pre-action
  // gate (tool.execute.before) where throwing is legal.
  // ─────────────────────────────────────────────────────────────────
  runAll(context: LoopCheckContext): TVIFinding[] {
    const findings: TVIFinding[] = [];

    if (context.screenshotPath !== undefined && context.lastReadTimestamp !== undefined) {
      const f = this.checkStaleRead(context.screenshotPath, context.lastReadTimestamp);
      if (f) findings.push(f);
    }

    const noVerify = this.checkNoVerify();
    if (noVerify) findings.push(noVerify);

    if (context.toolName !== undefined) {
      const f = this.checkToolUse(context.toolName, context.toolOutput);
      if (f) findings.push(f);
    }

    const repeatError = this.checkRepeatError();
    if (repeatError) findings.push(repeatError);

    if (context.pipelineComplete !== undefined) {
      const f = this.checkNoReport(context.pipelineComplete, context.reportGenerated === true);
      if (f) findings.push(f);
    }

    return findings;
  }
}
