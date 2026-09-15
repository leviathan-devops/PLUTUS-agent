/**
 * VEI v4.4.0 — guidance.ts — the guidance composer (spec §5.4 + §8).
 *
 * Finding → precise corrective text. The ONLY module that produces natural
 * language, and every string is a template with slots filled from
 * Finding.evidence + the truth layer + the pipeline context — zero free
 * generation, zero LLM (§12 laws 1 + anti-goal: no free-generated guidance).
 *
 * The 4-part shape (§8) — no vagueness permitted:
 *   [VEI:{CODE}] {what you did — with counts} → {why it's wrong — with evidence}
 *     → {the correct action — exact tool + exact args} → {how to confirm}
 */

import type { Finding } from './detectors.js';
import type { TruthLayer } from './truth.js';
import type { VeiLedger, VeiAction } from './ledger.js';
import { priceToY } from './truth.js';
import { evaluate } from './detectors.js';
import type { GuiProfile } from './profiles/tradingview.js';

/** BECAUSE §6.2: the rung→pixel map lists up to 8 rungs — chart-legibility
 *  bound consistent with the scaffold's own draw discipline. */
export const COORD_INJECTION_MAX_RUNGS = 8;

export interface GuidanceContext {
  scaffoldByPair?: Record<string, Array<{ price: number; top: number; bottom: number; type: string }>>;
  anchorLabel?: string;        // e.g. 'Jul 6-10, 2026'
  weekStartMs?: number;
  anchorMs?: number;
}

function ev(f: Finding, key: string): string {
  const v = f.evidence[key];
  return v === undefined ? 'unknown' : String(v);
}

/** The temporal recipe slots: prefer the truth anchor, else the pipeline ctx. */
function recipe(t: TruthLayer, ctx: GuidanceContext, profile: GuiProfile): string {
  const weekStartMs = t.anchor?.weekStartMs ?? ctx.weekStartMs;
  const anchorMs = t.anchor?.anchorMs ?? ctx.anchorMs;
  if (weekStartMs === undefined || anchorMs === undefined) {
    return profile.verbTable.temporal_navigation;
  }
  return profile.temporalRecipe({
    weekStartMs,
    anchorMs,
    label: t.anchor?.label ?? ctx.anchorLabel,
  });
}

/**
 * §6.2 coordinate injection: when the affine cache is fitted for the current
 * view AND the scaffold is available, append the rung→pixel map — the
 * operator's "the supply zone you are looking for is here at these pixels."
 * Returns null when uncalibrated (§12 law 3 — never a guess).
 */
export function composeCoordInjection(t: TruthLayer, ctx: GuidanceContext): string | null {
  if (!t.affine || t.affine.calibratedAt !== t.currentHash || !ctx.scaffoldByPair) return null;
  const lines: string[] = [];
  for (const [pair, rungs] of Object.entries(ctx.scaffoldByPair)) {
    const mapped: string[] = [];
    for (const r of rungs) {
      const y = priceToY(t, r.price);
      if (y !== null) mapped.push(`${r.price}→y≈${y}`);
      if (mapped.length >= COORD_INJECTION_MAX_RUNGS) break;
    }
    if (mapped.length > 0) lines.push(`  ${pair} rungs: ${mapped.join(', ')}.`);
  }
  if (lines.length === 0) return null;
  const quality = t.affine.quality === 'calibrated'
    ? `max residual ${t.affine.maxResidual.toFixed(1)}px`
    : 'provisional (2-sample fit — a 3rd find_price_y confirms quality)';
  return (
    `[VEI:COORD_CACHE] price↔Y fitted for this view (a=${t.affine.a.toFixed(2)} px/$, ${quality}).\n` +
    lines.join('\n') +
    `\n  Draw these WITHOUT further find_price_y probes. Recalibrate ONLY after pan/zoom (I will tell you if the cache is stale).`
  );
}

/** §8 catalog — one template per detector code, 4-part shape. */
export function compose(f: Finding, t: TruthLayer, ctx: GuidanceContext, profile: GuiProfile): string {
  switch (f.code) {
    case 'ACTION_REPETITION': {
      // §7.1 note: three identical calls WITH view changes is legitimate
      // progression — the composer DOWNGRADES to INFO when outcomes show change.
      if (f.evidence.viewUnchanged === false) {
        return (
          `[VEI:ACTION_REPETITION:INFO] ${f.toolName} (args ${ev(f, 'argsHash')}) ×${f.repeatCount} — the view IS changing ` +
          `(outcomes: ${ev(f, 'outcomes')}), so this may be legitimate progression → if you are navigating to a past week, ` +
          `zoom is still the wrong verb → ${recipe(t, ctx, profile)} → confirm with get_view.`
        );
      }
      return (
        `[VEI:ACTION_REPETITION] ${f.toolName} (args ${ev(f, 'argsHash')}) ×${f.repeatCount} with zero new effect ` +
        `(view hash ${ev(f, 'signature')} unchanged across all 3 calls) → repeating the same call cannot produce a ` +
        `different result → ${profile.verbTable.temporal_navigation} → confirm with get_view that the view moved.`
      );
    }
    case 'TOOL_FAILURE_STREAK':
      return (
        `[VEI:TOOL_FAILURE_STREAK] ${f.toolName} failed ${f.repeatCount}× consecutively (last args ${ev(f, 'lastArgsHash')}) → ` +
        `the same call will keep failing → ${profile.verbTable.tool_failure} → if the alternative fails once, STOP and ` +
        `report the blocker instead of retrying.`
      );
    case 'STATE_OSCILLATION':
      return (
        `[VEI:STATE_OSCILLATION] the view is flapping A↔B (${ev(f, 'hashA')} ↔ ${ev(f, 'hashB')}, ${f.repeatCount}/6 matches) → ` +
        `you are overshooting and reversing around a target you cannot land on → ${profile.verbTable.fine_positioning} → ` +
        `confirm with get_view after EACH pan and stop when the target window is in frame.`
      );
    case 'NAV_STAGNATION':
      return (
        `[VEI:NAV_STAGNATION] 3 navigation calls (${ev(f, 'tools')}) all left the view unchanged (hash ${ev(f, 'viewHash')}) → ` +
        `variations of the wrong approach still fail — the verb is wrong, not the args → ${recipe(t, ctx, profile)} → ` +
        `confirm with get_view: the bar range must change.`
      );
    case 'PERCEPTION_LOOP':
      return (
        `[VEI:PERCEPTION_LOOP] 3 identical screenshots (hash ${ev(f, 'hash')}) → the chart has not changed OR capture is ` +
        `silently failing — re-capturing adds nothing → act on the visual context you already have (read() the LAST ` +
        `screenshot), or change the chart first → confirm the next screenshot hash differs before re-reading.`
      );
    case 'CLICK_LOOP':
      return (
        `[VEI:CLICK_LOOP] 3 clicks within 20px of (${ev(f, 'centerX')},${ev(f, 'centerY')}) → clicking the same spot again ` +
        `cannot produce a different result → if the target is a toolbar flyout, hover first then click the arrow; ` +
        `otherwise re-aim using find_price_y/list_drawings coordinates → confirm the element state changed before clicking again.`
      );
    case 'NAVIGATION_DRIFT':
      return (
        `[VEI:NAVIGATION_DRIFT] ${f.repeatCount} navigation calls in the last 5 actions with zero productive verbs between → ` +
        `you are wandering — navigation is means, not progress → ${recipe(t, ctx, profile)} then RESUME the draw/verify ` +
        `work → confirm with get_view, then the next action must be a draw-class verb.`
      );
    case 'PROGRESS_STAGNATION':
      return (
        `[VEI:PROGRESS_STAGNATION] last 5 actions (${ev(f, 'tools')}) contain zero productive verbs → reading without ` +
        `producing stalls the pipeline → execute the next productive step NOW (draw the scaffold rungs — see the rung ` +
        `list) → confirm with list_drawings that the rung count increased.`
      );
    case 'EXCESSIVE_SCREENSHOTS':
      return (
        `[VEI:EXCESSIVE_SCREENSHOTS] ${f.repeatCount} screenshots in the window with zero read() calls → perception ` +
        `without consumption is waste → read() the LAST screenshot — you already have the visual context → confirm by ` +
        `emitting verdicts from what you read, not from a new capture.`
      );
    case 'TEMPORAL_ANCHOR': {
      // §8 D10 (L3 sitrep block — the W7-A killer).
      const label = t.anchor?.label ?? ctx.anchorLabel ?? 'the report week';
      const weekStartMs = t.anchor?.weekStartMs ?? ctx.weekStartMs ?? 0;
      const anchorMs = t.anchor?.anchorMs ?? ctx.anchorMs ?? 0;
      return (
        `[VEI SITREP — TEMPORAL_ANCHOR]\n` +
        `Your visible window is ${ev(f, 'visibleStart')} to ${ev(f, 'visibleEnd')} (coverage ${(Number(f.evidence.coverage) * 100).toFixed(0)}%). ` +
        `The report week is ${label} (${weekStartMs} to ${anchorMs}). Verdicts computed against future price are forward ` +
        `leakage (test-3: 17 false REJECTIONS, 0 setups).\n` +
        `RECOVERY: (1) ${recipe(t, ctx, profile)} (2) get_view — confirm ${label} fills the frame; (3) RE-CAPTURE the ` +
        `screenshot; (4) re-read and re-issue verdicts. Judge each rung ONLY by candles inside ${label}.`
      );
    }
    case 'DRAW_DUPLICATE':
      return (
        `[VEI:DRAW_DUPLICATE] ${f.toolName} (signature ${ev(f, 'signature')}) is already on the chart — drawn ` +
        `${f.repeatCount}× with identical args → the rung is drawn; a duplicate adds nothing → proceed to the NEXT rung ` +
        `in the scaffold list → confirm with ${profile.verbTable.verify_drawing}.`
      );
    case 'COORD_SPAM': {
      const injection = composeCoordInjection(t, ctx);
      return (
        `[VEI:COORD_CACHE] ${f.repeatCount} find_price_y calls in this view → the transform is already fitted ` +
        `(residual ${ev(f, 'residual')}px) → use it instead of probing` +
        (injection ? `:\n${injection}` : ' — call find_price_y again ONLY after pan/zoom.') +
        ` → confirm by drawing directly at the mapped y-pixels.`
      );
    }
    case 'WRONG_VERB':
      return (
        `[VEI:WRONG_VERB] ${f.toolName} ×${f.repeatCount} — the target week (${ev(f, 'targetWeekStart')}) is BEHIND the ` +
        `visible range (starts ${ev(f, 'visibleStart')}) → zoom cannot travel to a past week (it changes scale, never ` +
        `time position) → ${recipe(t, ctx, profile)} → then get_view: the target week must fill the frame.`
      );
  }
}

/** L1 one-line annotate (§4.2): one-line truth appended to the tool result. */
export function composeAnnotate(f: Finding): string {
  return `[VEI] ${f.code} on ${f.toolName} (×${f.repeatCount}) — first occurrence logged; repeat escalates to corrective guidance.`;
}

/** Appendix A.3 (enforceAction.js L509-558 → VEI): the honest-report
 *  annotation — never lets the agent believe an unverified success. */
export function annotateOutcome(tool: string, outcome: VeiAction['outcome']): string | null {
  switch (outcome) {
    case 'changed':
      return `[VEI] confirmed: view changed after ${tool}.`;
    case 'unchanged':
      return `[VEI] WARNING: ${tool} executed but the view did NOT change. The action had no measurable effect — do NOT proceed as if it worked.`;
    case 'failed':
      return `[VEI] ${tool} FAILED — see the tool error. Do not retry identical args.`;
    case 'unknown':
      return null; // 'unknown' is silent except the §6.1 calibration nudge (wire)
  }
}

/** §6.1: no get_view within 3 actions after nav-class calls → say so. */
export function composeCalibrationNudge(unresolvedNav: number): string {
  return `[VEI] no get_view since your last ${unresolvedNav} navigation calls — I cannot confirm the view moved. Call get_view once so I can calibrate.`;
}

/** §8 L3 full sitrep (trajectory health < 0.5 or BLOCK): structured state +
 *  top findings + recovery. Findings are re-evaluated from the SAME ledger and
 *  truth (deterministic — composeSitrep is a pure function of its inputs). */
export function composeSitrep(l: VeiLedger, t: TruthLayer, ctx: GuidanceContext, profile: GuiProfile): string {
  const verified = l.actions.filter((a) => a.verified);
  const breakdown = ['changed', 'unchanged', 'failed', 'unknown']
    .map((k) => `${k}: ${l.actions.filter((a) => a.outcome === k).length}`)
    .join(', ');
  const view = t.current
    ? `${t.current.symbol || '?'} ${t.current.timeframe || '?'}, bars ${t.current.barStartMs}-${t.current.barEndMs}, prices ${t.current.priceLow}-${t.current.priceHigh}`
    : 'unknown (no get_view parsed yet)';
  const affine = t.affine
    ? (t.affine.calibratedAt === t.currentHash ? `${t.affine.quality} (a=${t.affine.a.toFixed(2)})` : 'stale')
    : 'absent';
  const anchor = t.anchor?.label ?? ctx.anchorLabel ?? 'none';
  const findings = evaluate(l, t, profile).slice(0, 2);
  const wrong = findings.length > 0
    ? findings.map((f) => `${f.code} on ${f.toolName} ×${f.repeatCount}`).join('; ')
    : 'no active detector findings';
  const recovery = findings.length > 0
    ? findings.map((f, i) => `(${i + 1}) ${compose(f, t, ctx, profile)}`).join('\n')
    : '(1) resume the productive verb for the current pipeline step; (2) confirm with get_view/list_drawings.';
  return (
    `[VEI SITREP] Health ${l.health.toFixed(2)} over last ${l.actions.length} actions (${verified.length} verified: ${breakdown}).\n` +
    `  Current view: ${view}.\n` +
    `  Affine cache: ${affine}. Anchor: ${anchor}.\n` +
    `  What is going wrong: ${wrong}.\n` +
    `  Recovery sequence:\n  ${recovery}`
  );
}
