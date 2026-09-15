/**
 * MDVE Day-End Fill Simulation — the operator's fill-model law, VERBATIM:
 * "temporal lock is for pipeline generation. once everything is generated you
 * obviously need to fast forward to the END OF THE DAY END OF NY SESSION 1 hour
 * before market close to accurately see what E/SL/TP were actually hit"
 * (15) "yes obviously this needs to be built to ACCURATELY simluate a full
 * trading day".
 *
 * ═══════════════════════════════════════════════════════════════
 * THE BOUNDARY (what the temporal lock does and does NOT govern):
 *   - GENERATION is temporally locked: gateBars physically drops every bar
 *     past the run anchor (the pipeline never sees the future).
 *   - OUTCOME SIMULATION is the day-end fast-forward: given a generated
 *     trade (the pair, the direction, the E, the SL, the TP, the session
 *     bracket) + the FULL day's bars (the day's bars from the day's start
 *     00:00 UTC to the day-end 20:00 UTC = the NY close minus 1 hour — the
 *     sim's legitimate data, the reference's simBarsFor ungated feed), the
 *     module resolves what the E/SL/TP ACTUALLY did during that day.
 *   - The bars BEYOND the day-end are excluded — the sim simulates the DAY,
 *     not the week.
 * ═══════════════════════════════════════════════════════════════
 *
 * THE SEMANTICS (replicated from report-v452.ts's simulateUniqueTrade —
 * report-v452.ts:531-606 — the same trigger / bar-order / conservative rules):
 *   - TRIGGER: the first bracket bar whose touch reaches the entry
 *     (report-v452.ts:572 — LONG: b.low <= entry; SHORT: b.high >= entry).
 *     The trigger bar itself participates in the resolution (the reference's
 *     inner loop starts at the trigger index — report-v452.ts:577).
 *   - RESOLUTION: from the trigger bar forward, each bar checks the SL/TP
 *     touches (LONG: the SL below, the TP above; SHORT: the SL above, the
 *     TP below) until the day-end bracket expires.
 *   - THE BOTH-HIT ORDER (a bar touching BOTH the SL and the TP — the
 *     conservative deterministic rule): the open-to-SL leg precedes the
 *     open-to-TP leg — the SL is checked BEFORE the TP on every side. For a
 *     SHORT the SL leg is the upward leg; "the inverse for the LONG" = the
 *     same leg order with the SL on the opposite (downward) side — the SL
 *     still wins the tie → LOSS. This is the pessimistic adversarial canon
 *     (report-v452.ts:523-525 — "pessimistic within-bar ordering: SL checked
 *     before TP — the adversarial canon, verify-mirror-fix.ts:145").
 *   - NOT_TRIGGERED: the entry never touched within the bracket — the honest
 *     absence, NEVER a fabricated fill. Empty day-bars and degenerate
 *     geometry (|E − SL| = 0, a zero-width bracket) report NOT_TRIGGERED too.
 *   - OPEN (the day-window boundary, the honest 4th label): a trade that
 *     TRIGGERED but neither the SL nor the TP was hit by the day-end is
 *     still running at the horizon (20:00 UTC). Mapping it to WIN/LOSS would
 *     fabricate an exit; mapping it to NOT_TRIGGERED would deny its fill —
 *     the honest label is OPEN (the reference's 'open at data end' state,
 *     report-v452.ts:598-601).
 *   - RRR = |TP − entry| / |entry − SL| — the consequence of the geometry,
 *     NEVER an input; always returned. WIN → the realized +RRR; LOSS → −RRR;
 *     NOT_TRIGGERED / OPEN → the planned RRR (the checkable magnitude).
 *   - DETERMINISM: the bars are sorted ascending by timestamp inside the
 *     module (the deterministic iteration order) — the same bars → the
 *     byte-identical outcome on every run.
 *
 * ERROR PATHS FIRST: every degenerate input reports the honest NOT_TRIGGERED
 * with a detail string (never a throw, never a silent default).
 */

import type { OHLCBar } from '../types.js';

/** The trade the day-end simulation resolves (the plan's contract). */
export interface DayFillTrade {
  pair: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  sl: number;
  tp: number;
  /** The session bracket [start, end) — the day window the harness passes
   *  (00:00 UTC → the day-end 20:00 UTC for the Monday sim). */
  sessionStartMs: number;
  sessionEndMs: number;
}

/**
 * The outcome of the day-end simulation:
 *   - 'WIN'            — the TP was hit first (the exit at the TP).
 *   - 'LOSS'           — the SL was hit first (the exit at the SL).
 *   - 'NOT_TRIGGERED'  — the entry was never touched in the bracket (or the
 *                        bars/geometry are degenerate — the honest absence).
 *   - 'OPEN'           — triggered but neither SL nor TP hit by the day-end
 *                        (the documented day-window-boundary label).
 * exitPrice = the exit level (the SL or the TP) when resolved, else null.
 * rrr = |TP − E| / |E − SL| — always returned (the checkable consequence).
 * detail = the mechanism trace (the honest why — never narration).
 */
export interface FillOutcome {
  status: 'WIN' | 'LOSS' | 'NOT_TRIGGERED' | 'OPEN';
  exitPrice: number | null;
  rrr: number;
  detail: string;
}

/**
 * simulateDayFill — resolve what the E/SL/TP actually did during the trade's
 * day. dayBars are the full-day bars (00:00 UTC → the day-end, the caller's
 * window); the module sorts them ascending and iterates deterministically.
 */
export function simulateDayFill(trade: DayFillTrade, dayBars: OHLCBar[]): FillOutcome {
  const { direction, entry, sl, tp, sessionStartMs, sessionEndMs } = trade;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const rrr = risk === 0 ? 0 : reward / risk;
  const noTrade = (detail: string): FillOutcome => ({
    status: 'NOT_TRIGGERED', exitPrice: null, rrr, detail,
  });

  // ERROR PATHS FIRST (the audit gate flags silent failures): every
  // degenerate input reports the honest NOT_TRIGGERED with the mechanism.
  if (dayBars.length === 0) return noTrade('no bars in the day window — the honest NOT_TRIGGERED');
  if (risk === 0) return noTrade(`degenerate geometry — |entry − SL| = 0 (entry ${entry} === sl ${sl})`);
  if (sessionEndMs <= sessionStartMs) return noTrade(`degenerate bracket [${sessionStartMs}, ${sessionEndMs})`);

  // THE DETERMINISM — the ascending-timestamp iteration (the plan's law).
  const bars = [...dayBars].sort((a, b) => a.timestamp - b.timestamp);

  // THE TRIGGER — the first bracket bar whose touch reaches the entry
  // (the reference's fills predicate, report-v452.ts:572).
  let triggerIdx = -1;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    if (b.timestamp < sessionStartMs || b.timestamp >= sessionEndMs) continue;
    const fills = direction === 'LONG' ? b.low <= entry : b.high >= entry;
    if (fills) { triggerIdx = i; break; }
  }
  if (triggerIdx < 0) {
    return noTrade(`entry ${entry} never touched within the bracket — the honest NOT_TRIGGERED (never a fabricated fill)`);
  }

  // THE RESOLUTION — from the trigger bar forward, the conservative
  // bar-order rule: the SL is checked BEFORE the TP on every bar (the
  // both-hit tie goes to the SL → LOSS — the pessimistic adversarial canon,
  // report-v452.ts:582-596). The bracket expires at the day-end.
  for (let i = triggerIdx; i < bars.length; i++) {
    const b = bars[i]!;
    if (b.timestamp >= sessionEndMs) break;
    if (direction === 'LONG') {
      if (b.low <= sl) {
        return { status: 'LOSS', exitPrice: sl, rrr, detail: `SL ${sl} hit ${new Date(b.timestamp).toISOString()} (the SL leg first — conservative)` };
      }
      if (b.high >= tp) {
        return { status: 'WIN', exitPrice: tp, rrr, detail: `TP ${tp} hit ${new Date(b.timestamp).toISOString()}` };
      }
    } else {
      if (b.high >= sl) {
        return { status: 'LOSS', exitPrice: sl, rrr, detail: `SL ${sl} hit ${new Date(b.timestamp).toISOString()} (the SL leg first — conservative)` };
      }
      if (b.low <= tp) {
        return { status: 'WIN', exitPrice: tp, rrr, detail: `TP ${tp} hit ${new Date(b.timestamp).toISOString()}` };
      }
    }
  }

  // THE DAY-END BOUNDARY — triggered but unresolved by the day-end 20:00 UTC
  // (the NY close minus 1 hour): the position is still running at the
  // horizon — the honest OPEN (never a fabricated WIN/LOSS, never a denied
  // fill). The reference's identical state: report-v452.ts:598-601.
  return {
    status: 'OPEN',
    exitPrice: null,
    rrr,
    detail: `triggered ${new Date(bars[triggerIdx]!.timestamp).toISOString()}, neither SL ${sl} nor TP ${tp} hit by the day-end ${new Date(sessionEndMs).toISOString()}`,
  };
}
