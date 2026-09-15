/**
 * VEI v4.4.0 — wire.ts — hook integration (spec §5.6 + §10).
 *
 * Registers VEI into src/index.ts's existing hook chain. Honors the
 * binary-verified K-contract: BEFORE-trigger args live in the OUTPUT
 * parameter — read via `(output?.args ?? input?.args ?? input)` (index.ts:189).
 *
 * Laws enforced here:
 *  - Non-GUI tools: one prefix check → passthrough, zero overhead (§5.6).
 *  - Fail-silent-off (§12 law 6): any VEI internal error → log + disable for
 *    the session. VEI must never break the pipeline it observes.
 *  - Observe + guide ONLY (§12 law 4): VEI never executes, never blocks,
 *    never edits the plan/pipeline. It returns text; the hook appends it.
 */

import type { VeiAction, VeiLedger } from './ledger.js';
import {
  createLedger, recordIntent, recordOutcome, serialize, restore, VeiInvariantError,
} from './ledger.js';
import type { TruthLayer } from './truth.js';
import {
  createTruth, recordViewState, recordPriceSample, computeOutcome,
  setAnchor, unwrapResult, sha256OfText,
} from './truth.js';
import { evaluate } from './detectors.js';
import type { Finding } from './detectors.js';
import type { GuidanceContext } from './guidance.js';
import {
  compose, composeAnnotate, composeSitrep, annotateOutcome,
  composeCalibrationNudge, composeCoordInjection,
} from './guidance.js';
import type { GuiProfile } from './profiles/tradingview.js';

type LadderLevel = 'L0' | 'L1' | 'L2' | 'L3';

interface VeiSession {
  ledger: VeiLedger;
  truth: TruthLayer;
  ladder: LadderLevel;
  disabled: boolean;
  lastIntent: VeiAction | null;
  cleanStreak: number;                       // consecutive finding-free outcomes (hysteresis)
  recentFindings: Array<{ seq: number; code: string }>; // for same-code + compound rules
  pendingSitrep: boolean;
  lastCoordInjectHash: string | null;
  lastActivity: number;
}

/** BECAUSE §11: sessions older than 24h are dropped (bounded memory). */
const SESSION_TTL_MS = 24 * 3_600_000;
/** BECAUSE §4.2.1: health is undefined below 5 verified actions. */
const MIN_VERIFIED_FOR_LADDER = 5;
/** BECAUSE §4.2.1 hysteresis (AG's exact anti-flap rule): de-escalation
 *  requires 10 CONSECUTIVE clean verified outcomes — escalation is immediate,
 *  de-escalation is earned. */
const HYSTERESIS_CLEAN_STREAK = 10;
/** BECAUSE §6.1: the calibration nudge fires when 3 nav-class calls passed
 *  with no get_view. */
const UNRESOLVED_NAV_NUDGE = 3;

/** Pipeline context observed from the tool stream (read-only): weekStart args
 *  and scaffoldLadders outputs. VEI never touches engine.ts state (frozen). */
interface ObservedContext {
  weekStartMs?: number;
  anchorMs?: number;
  anchorLabel?: string;
  scaffoldByPair?: GuidanceContext['scaffoldByPair'];
}

export interface VeiHooks {
  onToolBefore(tool: string, args: unknown, sessionID: string): void;
  onToolAfter(tool: string, args: unknown, result: unknown, sessionID: string): string | null;
  onMessagesTransform(sessionID?: string): string | null;
}

const WEEKSTART_RE = /(\d{4}-\d{2}-\d{2})/;

export function createVeiHooks(
  profile: GuiProfile,
  getPipelineContext: () => GuidanceContext,
  log: (msg: string) => void = () => {},
): VeiHooks {
  const sessions = new Map<string, VeiSession>();
  const observed: ObservedContext = {};

  function getSession(sessionID: string): VeiSession {
    let s = sessions.get(sessionID);
    if (!s) {
      s = {
        ledger: createLedger(sessionID),
        truth: createTruth(),
        ladder: 'L0',
        disabled: false,
        lastIntent: null,
        cleanStreak: 0,
        recentFindings: [],
        pendingSitrep: false,
        lastCoordInjectHash: null,
        lastActivity: Date.now(),
      };
      sessions.set(sessionID, s);
    }
    s.lastActivity = Date.now();
    return s;
  }

  function evictStaleSessions(): void {
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (now - s.lastActivity > SESSION_TTL_MS) sessions.delete(id);
    }
  }

  function disable(s: VeiSession, why: string): void {
    s.disabled = true;
    log(`[VEI] disabled for session (fail-silent-off, §12 law 6): ${why}`);
  }

  /** Observe pipeline context from ANY tool's args (weekStart) — read-only. */
  function observeArgsContext(args: unknown, s: VeiSession | null): void {
    if (!args || typeof args !== 'object') return;
    const ws = (args as Record<string, unknown>).weekStart;
    if (typeof ws === 'string' && WEEKSTART_RE.test(ws)) {
      const probe = createTruth();
      setAnchor(probe, ws);
      if (probe.anchor) {
        observed.weekStartMs = probe.anchor.weekStartMs;
        observed.anchorMs = probe.anchor.anchorMs;
        observed.anchorLabel = probe.anchor.label;
        if (s) s.truth.anchor = probe.anchor;
      }
    }
  }

  /** Observe scaffoldLadders from pipeline tool outputs — read-only. */
  function observeResultContext(result: unknown): void {
    const r = unwrapResult(result);
    if (!r || typeof r !== 'object') return;
    const ladders = (r as Record<string, unknown>).scaffoldLadders;
    if (!ladders || typeof ladders !== 'object') return;
    const byPair: NonNullable<GuidanceContext['scaffoldByPair']> = {};
    for (const [pair, rungs] of Object.entries(ladders as Record<string, unknown>)) {
      if (!Array.isArray(rungs)) continue;
      byPair[pair] = rungs
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => {
          const price = typeof x.price === 'number' ? x.price : NaN;
          return {
            price,
            top: typeof x.top === 'number' ? x.top : price,
            bottom: typeof x.bottom === 'number' ? x.bottom : price,
            type: typeof x.type === 'string' ? x.type : 'UNKNOWN',
          };
        })
        .filter((x) => Number.isFinite(x.price));
    }
    if (Object.keys(byPair).length > 0) observed.scaffoldByPair = byPair;
  }

  function mergedContext(): GuidanceContext {
    return { ...observed, ...getPipelineContext() };
  }

  /** §4.2.1 ladder state machine (full transition table). */
  function stepLadder(s: VeiSession, findings: Finding[]): void {
    const verifiedCount = s.ledger.actions.filter((a) => a.verified).length;
    const health = verifiedCount >= MIN_VERIFIED_FOR_LADDER ? s.ledger.health : undefined;
    const prev = s.ladder;

    if (findings.length === 0) {
      s.cleanStreak += 1;
      // De-escalation: one level per 10 consecutive clean outcomes (hysteresis).
      if (s.cleanStreak >= HYSTERESIS_CLEAN_STREAK && s.ladder !== 'L0') {
        s.ladder = s.ladder === 'L3' ? 'L2' : s.ladder === 'L2' ? 'L1' : 'L0';
        s.cleanStreak = 0;
      }
    } else {
      s.cleanStreak = 0;
      const hasBlock = findings.some((f) => f.severity === 'BLOCK');
      const distinctRecent = new Set(
        s.recentFindings.filter((r) => r.seq >= s.ledger.seqNext - 5).map((r) => r.code),
      );
      for (const f of findings) distinctRecent.add(f.code);
      const sameCodeBefore = s.recentFindings.some((r) => r.code === findings[0].code);

      // BLOCK severity → L3 immediately (§4.2 trigger table).
      if (hasBlock) {
        s.ladder = 'L3';
      } else if (s.ladder === 'L0') {
        s.ladder = 'L1'; // first Finding of any code
      } else if (s.ladder === 'L1') {
        if (sameCodeBefore
          || (findings.some((f) => f.severity === 'WARN') && health !== undefined && health < 0.7)
          || (health !== undefined && health < 0.5)) {
          s.ladder = 'L2';
        }
      } else if (s.ladder === 'L2') {
        if ((health !== undefined && health < 0.5) || distinctRecent.size >= 3) {
          s.ladder = 'L3';
        }
      }

      for (const f of findings) {
        s.recentFindings.push({ seq: s.ledger.seqNext, code: f.code });
      }
      while (s.recentFindings.length > 20) s.recentFindings.shift();
    }

    if (s.ladder !== prev) {
      log(`[VEI] ladder ${prev}→${s.ladder} (health ${health === undefined ? 'n/a' : health.toFixed(2)}, trigger: ${findings[0]?.code ?? 'hysteresis'})`);
    }
  }

  return {
    onToolBefore(tool: string, args: unknown, sessionID: string): void {
      let s: VeiSession | null = null;
      try {
        evictStaleSessions();
        // Pipeline-context observation is cheap and applies to all tools.
        s = getSession(sessionID);
        if (s.disabled) return;
        observeArgsContext(args, s);
        if (!profile.matches(tool)) return; // one prefix check → passthrough
        const a = recordIntent(s.ledger, tool, args);
        if (profile.navClass.has(tool)) a.viewHashBefore = s.truth.currentHash;
        if (profile.productiveTools.has(tool)) s.ledger.productiveCount += 1;
        s.lastIntent = a;
      } catch (e) {
        if (s) disable(s, e instanceof Error ? e.message : String(e));
      }
    },

    onToolAfter(tool: string, args: unknown, result: unknown, sessionID: string): string | null {
      let s: VeiSession | null = null;
      try {
        s = getSession(sessionID);
        if (s.disabled) return null;
        observeResultContext(result);
        observeArgsContext(args, s);
        // 'read' is a non-GUI marker the D9 detector needs in the ledger.
        const isReadMarker = tool === 'read';
        if (!profile.matches(tool) && !isReadMarker) return null;

        const resultText = typeof result === 'string'
          ? result
          : typeof (result as Record<string, unknown> | null)?.output === 'string'
            ? (result as Record<string, unknown>).output as string
            : JSON.stringify(unwrapResult(result) ?? '');

        // Fold environment truth out of the result (§4.1 step 4).
        const parsed = unwrapResult(result);
        if (tool.includes('get_view')) {
          const vs = profile.parseViewState(parsed);
          if (vs) {
            const newHash = recordViewState(s.truth, vs);
            // §6.1: consume the agent's own get_view to resolve pending nav
            // outcomes (VEI never forces a get_view — no extra traffic).
            for (const a of s.ledger.actions) {
              if (profile.navClass.has(a.tool) && a.outcome === 'unknown' && a.viewHashBefore !== null) {
                recordOutcome(s.ledger, a, a.viewHashBefore !== newHash ? 'changed' : 'unchanged', newHash);
              }
            }
          }
        } else if (tool.endsWith('find_price_y')) {
          const o = parsed as Record<string, unknown> | null;
          if (o && typeof o.price === 'number' && typeof o.y === 'number') {
            recordPriceSample(s.truth, o.price, o.y);
          }
        } else if (tool.includes('screenshot')) {
          const hash = sha256OfText(resultText);
          const path = typeof (parsed as Record<string, unknown> | null)?.path === 'string'
            ? (parsed as Record<string, unknown>).path as string
            : '';
          s.truth.screenshots.push({
            path, bytes: resultText.length, hash, viewHash: s.truth.currentHash,
          });
          s.ledger.screenshotHashes.push(hash);
        }

        // Phase tracking (§4.3): screenshots/reads are perception-class.
        if (tool.includes('screenshot') || isReadMarker) s.truth.phase = 'perception';
        else if (profile.navClass.has(tool)) s.truth.phase = 'other';

        // Outcome (§6.1 polarity). Failure detection: the MCP layer surfaces
        // tool errors as error-prefixed text or an {error} payload.
        const failed = /^\s*(error|Error)\b/.test(resultText) || /"error"\s*:/.test(resultText);
        const expected = profile.expectedChange(tool);
        const before = s.lastIntent?.tool === tool ? s.lastIntent.viewHashBefore : null;
        let outcome: VeiAction['outcome'];
        if (isReadMarker) outcome = 'unknown';
        else if (failed) outcome = 'failed';
        else outcome = computeOutcome(s.truth, tool, before, expected);

        const a = s.lastIntent && s.lastIntent.tool === tool
          ? s.lastIntent
          : recordIntent(s.ledger, tool, args);
        recordOutcome(s.ledger, a, outcome, s.truth.currentHash);

        // Detectors (§7) + ladder (§4.2.1).
        const findings = evaluate(s.ledger, s.truth, profile);
        stepLadder(s, findings);

        // Delivery (§4.1 step 9): L1 annotate / L2 corrective / L3 sitrep.
        const pieces: string[] = [];
        // Appendix A.3 honest report: nav-class outcomes + failures are always
        // annotated (never let the agent believe an unverified success).
        if (!isReadMarker && (expected === 'view' || outcome === 'failed')) {
          const note = annotateOutcome(tool, outcome);
          if (note) pieces.push(note);
        }
        if (profile.navClass.has(tool) && outcome === 'unknown') {
          const unresolved = s.ledger.actions.filter(
            (x) => profile.navClass.has(x.tool) && x.outcome === 'unknown',
          ).length;
          if (unresolved >= UNRESOLVED_NAV_NUDGE) pieces.push(composeCalibrationNudge(unresolved));
        }
        if (findings.length > 0) {
          if (s.ladder === 'L1') {
            pieces.push(composeAnnotate(findings[0]));
          } else { // L2/L3 → full 4-part corrective directives
            for (const f of findings) pieces.push(compose(f, s.truth, mergedContext(), profile));
          }
          if (s.ladder === 'L3') s.pendingSitrep = true;
        }
        // §6.2 coordinate injection: first draw-class call per view, or COORD_SPAM.
        if ((profile.drawClass.has(tool) || findings.some((f) => f.code === 'COORD_SPAM'))
          && s.lastCoordInjectHash !== s.truth.currentHash) {
          const injection = composeCoordInjection(s.truth, mergedContext());
          if (injection) {
            pieces.push(injection);
            s.lastCoordInjectHash = s.truth.currentHash;
          }
        }
        return pieces.length > 0 ? '\n' + pieces.join('\n') : null;
      } catch (e) {
        if (s) disable(s, e instanceof Error ? e.message : String(e));
        return null;
      }
    },

    /** L3 sitrep injection (§10 messages.transform). */
    onMessagesTransform(sessionID?: string): string | null {
      try {
        const candidates = sessionID
          ? [sessions.get(sessionID)]
          : [...sessions.values()];
        for (const s of candidates) {
          if (s && !s.disabled && s.pendingSitrep) {
            s.pendingSitrep = false;
            return composeSitrep(s.ledger, s.truth, mergedContext(), profile);
          }
        }
        return null;
      } catch (e) {
        log(`[VEI] sitrep failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
    },
  };
}

// Re-exports for the compaction-survival flow (§11) and test rigs.
export { serialize, restore, VeiInvariantError };
