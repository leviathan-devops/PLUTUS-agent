/**
 * TEMPORAL ENGINE — the locked run-anchor gate (the operator's temporal law).
 *
 * THE OPERATOR'S LAW (verbatim):
 *   "IN A REAL FUCKING LIVE MARKET FORWARD DATA DOESNT EXIST WHY THE FUCK IS
 *    LOOKING FORWARD FOR DATA EVEN AN OPTION THE ONLY DATA THAT EXISTS IS
 *    HISTORICAL + TODAY/RIGHT NOW. TODAY IS WHATEVER DATE WE SET WHEN RUNNING
 *    THE PIPELINE. THERE IS NO FUCKING FORWARD LOOKING. THE POINT IS TO MANUALLY
 *    RUN THE PIPELINE ONCE AT LONDON SESSION OPEN ON EACH FUCKING DAY WITH THE
 *    DATA AVAIALBLE AT THAT MOMENT AND FULLY RUN THE ENTIRE FUCKING PIPELINE
 *    FROM SCRATCH WITHOUT CHEATING."
 *   "there needs to be a clear temporal anchor for 'today' wired into the
 *    codebase... a proper date and time input that it physically blocks any
 *    future data from ever being read or input anywhere into the machine past
 *    this. and this is LOCKED until the pipeline finishes so it cannot be gamed
 *    and changed right in the middle."
 *
 * THE MECHANISM:
 *   - lockRunAnchor(ms) — the ONE-WAY lock. The anchor is set exactly once at
 *     the pipeline entry; a DIFFERENT value mid-run THROWS (never a silent
 *     overwrite — the audit gate flags the silent failure). A same-value
 *     re-lock is an idempotent no-op.
 *   - getRunAnchorMs() — fail-fast: THROWS when unlocked (never a silent 0 or
 *     undefined that would pass everything).
 *   - gateBars(bars) — the TOTAL filter: when locked, every bar with
 *     timestamp > the anchor is DROPPED (single filter pass). When UNLOCKED
 *     the gate is INERT (returns the input unchanged) — the legacy paths
 *     never lock and never gate, byte-identical behavior.
 *
 * Self-contained: ZERO imports. Deterministic: the anchor is a ms number
 * computed from the operator's --day/--time input, never wall-clock.
 */

let lockedAnchorMs: number | null = null;

/**
 * THE ANALYSIS POINT (the operator's temporal law, 2026-08-09):
 *   "everything needs to be done temporally anchored to LONDON SESSION
 *    PRE-MARKET w/ all the data visible up until this point. In the 1H before
 *    london session starts is when i manually do all my analysis and setup my
 *    trades for the day and then close the charts and the prices action just
 *    fills my limit orders and hits TP/SL accordingly. That's what this
 *    pipeline needs to replicate."
 * The Monday 2026-07-06 06:00 UTC — the START of the pre-London hour (the
 * London FX open = 07:00 UTC). The Friday-close 1783702800000 is DEAD (it
 * leaks the week's reactions into the designation). One constant, everywhere.
 */
export const ANALYSIS_POINT_MS = 1783317600000;

/** Lock the analysis point (one-way — the §2.1 semantic name). Idempotent on
 *  a same-value re-lock; THROWS on a DIFFERENT value — the anchor cannot be
 *  changed mid-run. */
export function lockAnalysisPoint(ms: number): void {
  if (lockedAnchorMs === null) {
    lockedAnchorMs = ms;
    return;
  }
  if (lockedAnchorMs === ms) return; // idempotent same-value re-lock
  throw new Error(
    `TEMPORAL LOCK VIOLATION: the analysis point already locked at ${lockedAnchorMs} - attempted ${ms}. The anchor is one-way; restart the pipeline to re-anchor.`,
  );
}

/** The locked analysis point — fail-fast: THROWS when the lock has not been set. */
export function getAnalysisPointMs(): number {
  if (lockedAnchorMs === null) {
    throw new Error(
      'TEMPORAL UNLOCKED: the analysis point is not locked - call lockAnalysisPoint(ms) at the pipeline entry before any data read.',
    );
  }
  return lockedAnchorMs;
}

/** Whether the analysis point is locked (the gate's armed state). */
export function isAnalysisPointLocked(): boolean {
  return lockedAnchorMs !== null;
}

/** THE DAY OPEN AT THE ANALYSIS POINT (§2.1 — the operator's workflow made
 *  mechanical): the last 1H close at or before the analysis point — the market
 *  state the operator sees when the charts open at 06:00 (the 06:00 bar's open
 *  = the 05:00 bar's close, per the bar semantics — the value is the same
 *  either way, the semantic is frozen). NEVER the prior-day close. */
export function dayOpenSpotAt(analysisPointMs: number, bars1H: readonly { timestamp: number; close: number }[]): number {
  const anchorBars = bars1H.filter((b) => b.timestamp <= analysisPointMs);
  const last = anchorBars[anchorBars.length - 1];
  if (!last) {
    throw new Error(
      `TEMPORAL: no 1H bars at or before the analysis point ${analysisPointMs} — the temporal law requires the data visible at the analysis moment.`,
    );
  }
  return last.close;
}

/** Lock the run anchor (one-way). Idempotent on a same-value re-lock;
 *  THROWS on a DIFFERENT value — the anchor cannot be changed mid-run. */
export function lockRunAnchor(ms: number): void {
  if (lockedAnchorMs === null) {
    lockedAnchorMs = ms;
    return;
  }
  if (lockedAnchorMs === ms) return; // idempotent same-value re-lock
  throw new Error(
    `TEMPORAL LOCK VIOLATION: run anchor already locked at ${lockedAnchorMs} - attempted ${ms}. The anchor is one-way; restart the pipeline to re-anchor.`,
  );
}

/** The locked anchor — fail-fast: THROWS when the lock has not been set. */
export function getRunAnchorMs(): number {
  if (lockedAnchorMs === null) {
    throw new Error(
      'TEMPORAL UNLOCKED: the run anchor is not locked - call lockRunAnchor(ms) at the pipeline entry before any data read.',
    );
  }
  return lockedAnchorMs;
}

/** Whether the run anchor is locked (the gate's armed state). */
export function isRunAnchorLocked(): boolean {
  return lockedAnchorMs !== null;
}

/** The TOTAL bar gate: when locked, drops every bar past the anchor; when
 *  unlocked, returns the input UNCHANGED (the legacy no-lock paths never
 *  gate — byte-identical). */
export function gateBars<T extends { timestamp: number }>(bars: readonly T[]): T[] {
  const anchor = lockedAnchorMs;
  if (anchor === null) return bars as T[];
  return bars.filter((b) => b.timestamp <= anchor);
}
