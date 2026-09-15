/**
 * ACCURATE-STATS — the v4.5.2 accurate clean reporting engine (PKG-REPORT).
 *
 * Spec: MASTER_CONTEXT/PLUTUS_V4.5.2_SPEC.md §6 (the stats engine + the
 * mandatory fields + the SL_vs_ENTRY dedup) and §7 (the STALE bucket +
 * the session-label honesty rule). Oracle: the independent audit
 * (Visual_Evals/v4.5.1/INDEPENDENT_AUDIT_v452.md) — 13 unique trades,
 * 11W/2L, 84.6% WR, +31.23R on the DEDUPLICATED set.
 *
 * THE CANON (NON-NEGOTIABLE):
 *   - NO EMBELLISHED STATS. Every stat is computed on the deduplicated
 *     (unique) trade set ONLY, and every stat carries its n.
 *   - Every reported trade carries the §6.3 mandatory fields: trade_id,
 *     is_staggered, staggeredEntries, triggered_in_week, resolved_in_week,
 *     n, provenance (plus outcome).
 *   - THE STALE BUCKET (§7.2): trades whose trigger OR resolution falls
 *     outside the eval week are separated from the weekly headline.
 *   - SESSION-LABEL HONESTY (§7.3): a session label is only emitted if the
 *     actual fill timestamp falls inside that session's window; otherwise
 *     the label is replaced by the honest intended→actual form (or
 *     UNVERIFIED when no fill timestamp exists).
 *   - SL_vs_ENTRY DEDUP (§6.4): the util vote counts are computed on
 *     unique trades only (the GU ×10 collapse: 10 identical votes → 1).
 *
 * Session windows: the canonical codebase definitions — SessionWindow
 * (src/types.ts:105-112) + the ET constants (src/constants/trading-
 * constants.ts:277-284, ET_UTC_OFFSET=4). All labels are ET; the eval
 * week (Jul 6-10 2026) is in EDT (UTC-4), matching ET_UTC_OFFSET.
 */

import { PIP_VALUE } from '../types.js';
import {
  ET_UTC_OFFSET,
  LONDON_OPEN_START_ET,
  LONDON_OPEN_END_ET,
  LONDON_MID_END_ET,
  NY_OVERLAP_END_ET,
  NY_MID_END_ET,
  NY_CLOSE_END_ET,
} from '../constants/trading-constants.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EvalWeek {
  start: string; // ISO 'YYYY-MM-DD', inclusive
  end: string;   // ISO 'YYYY-MM-DD', inclusive (through 23:59:59Z)
}

export type Direction = 'LONG' | 'SHORT';
export type Outcome = 'WIN' | 'LOSS' | 'OPEN' | 'NOT_TRIGGERED';

export interface StaggeredLeg {
  leg: string;            // 'E1' | 'E2' | 'E3' | ...
  entry: number;
  weight: number;         // the frozen 0.33/0.33/0.34 ladder (normalized at blend)
  session?: string;       // provenance: which session this leg came from
  triggerMs?: number;
}

/** The deduplicated trade as produced by src/mdve/trade-dedup.ts (PKG-DEDUP). */
export interface UniqueTradeInput {
  trade_id: string;       // the dedup identity: pair|dir|anchorBucket|day
  pair: string;
  direction: Direction;
  day: string;            // ISO 'YYYY-MM-DD' (the setup's labeled day)
  intendedSession?: string | null;  // e.g. 'Monday London Open'
  entry: number;          // headline entry (first leg for staggered)
  sl: number;             // ONE SL (the structural SL — all legs share it)
  tp: number;             // ONE TP (the wall target)
  is_staggered: boolean;
  staggeredEntries: StaggeredLeg[];
  triggerMs: number | null;  // the FIRST leg's fill timestamp (null = never triggered)
  exitMs: number | null;     // the TP/SL exit timestamp (null = unresolved)
  exitPrice: number | null;  // the actual exit price (TP for WIN, SL for LOSS)
  outcome: Outcome;
  provenance: string[];      // the merged source row ids
}

export interface SessionHonesty {
  intendedLabel: string | null;
  intendedWindow: string | null;   // the canonical window the label names
  actualSession: string;           // the window the fill actually fell in, or 'OFF-SESSION' / 'UNVERIFIED'
  fillET: string | null;           // 'HH:MM ET' of the actual fill
  honest: boolean;                 // true iff the intended label matches the actual fill window
  honestLabel: string;             // the label the report may emit (§7.3)
}

/** A reported trade — the input trade + the §6.3 mandatory fields, enriched. */
export interface ReportTrade extends UniqueTradeInput {
  blendedEntry: number;         // weighted-mean entry across the legs (normalized weights)
  realizedR: number | null;     // (exit − blendedEntry)/|blendedEntry − SL| with direction sign
  plannedRrr: number;           // the blended RRR (§3.2): Σ ŵ_i × |TP − e_i|/|e_i − SL|
  triggered_in_week: boolean;   // §3.3: the first leg's triggerMs is inside the eval week
  resolved_in_week: boolean;    // §3.3: the exitMs is inside the eval week
  n: number;                    // the unique-trade count of the bucket this trade is reported in
  sessionHonesty: SessionHonesty;
}

export interface StatsBlock {
  n: number;        // resolved unique trades — every win rate carries its n
  total: number;    // unique trades in the set (incl. OPEN / NOT_TRIGGERED)
  wins: number;
  losses: number;
  winRate: number;  // wins / n, 1 decimal (0 when n = 0)
  totalR: number;   // Σ realizedR over resolved trades, 2 decimals
  avgRrr: number;   // mean plannedRrr over WINNING trades (§6.2), 2 decimals (0 when no wins)
}

export interface AccurateReport {
  evalWeek: EvalWeek;
  uniqueTradeCount: number;
  headline: StatsBlock;          // fully in-week trades (triggered AND resolved in-week) — §7.2
  inWeekTriggered: StatsBlock;   // §7.2 operator default: triggered in-week (may resolve post-week)
  overall: StatsBlock;           // the full unique set (the audit-TRUE stats)
  staleCount: number;
  perPair: Record<string, { headline: StatsBlock; overall: StatsBlock }>;
  inWeek: ReportTrade[];
  stale: ReportTrade[];
  trades: ReportTrade[];         // all enriched trades, deterministic order (input order)
}

// ─── Session windows (canonical — src/types.ts SessionWindow, ET) ──────────

interface SessionWindowDef { name: string; startET: number; endET: number }

const SESSION_WINDOWS_ET: readonly SessionWindowDef[] = [
  { name: 'London Open', startET: LONDON_OPEN_START_ET, endET: LONDON_OPEN_END_ET },   // 02:00-05:00 ET
  { name: 'London Mid', startET: LONDON_OPEN_END_ET, endET: LONDON_MID_END_ET },       // 05:00-08:00 ET
  { name: 'NY Overlap', startET: LONDON_MID_END_ET, endET: NY_OVERLAP_END_ET },        // 08:00-10:00 ET
  { name: 'NY Open', startET: 8.5, endET: NY_OVERLAP_END_ET },                         // 08:30-10:00 ET
  { name: 'NY Mid', startET: NY_OVERLAP_END_ET, endET: NY_MID_END_ET },                // 10:00-14:00 ET
  { name: 'NY Close', startET: NY_MID_END_ET, endET: NY_CLOSE_END_ET },                // 14:00-17:00 ET
];

// ─── R computation (spec §3.2 — blended entry / blended RRR) ───────────────

/** Normalized-weight blended entry. Weights normalize so N-leg merges blend
 *  correctly (the frozen 0.33/0.33/0.34 ladder sums to 1.00 for 3 legs —
 *  normalization is a no-op there). */
export function blendedEntryOf(t: UniqueTradeInput): number {
  if (!t.is_staggered || t.staggeredEntries.length === 0) return t.entry;
  const wSum = t.staggeredEntries.reduce((s, l) => s + l.weight, 0);
  if (wSum <= 0) return t.entry;
  return t.staggeredEntries.reduce((s, l) => s + l.entry * l.weight, 0) / wSum;
}

/** The blended planned RRR (§3.2): Σ ŵ_i × |TP − leg_i.entry| / |leg_i.entry − SL|. */
export function plannedRrrOf(t: UniqueTradeInput): number {
  const legs = t.is_staggered && t.staggeredEntries.length > 0 ? t.staggeredEntries : null;
  if (!legs) {
    const risk = Math.abs(t.entry - t.sl);
    return risk > 0 ? Math.abs(t.tp - t.entry) / risk : 0;
  }
  const wSum = legs.reduce((s, l) => s + l.weight, 0);
  if (wSum <= 0) return 0;
  let rrr = 0;
  for (const l of legs) {
    const risk = Math.abs(l.entry - t.sl);
    if (risk > 0) rrr += (l.weight / wSum) * (Math.abs(t.tp - l.entry) / risk);
  }
  return rrr;
}

/** Realized R = (exit − blendedEntry)/|blendedEntry − SL| with direction sign. */
export function realizedROf(t: UniqueTradeInput): number | null {
  if (t.outcome !== 'WIN' && t.outcome !== 'LOSS') return null;
  if (t.exitPrice == null) return null;
  const e = blendedEntryOf(t);
  const risk = Math.abs(e - t.sl);
  if (risk <= 0) return null;
  const raw = (t.exitPrice - e) / risk;
  return t.direction === 'LONG' ? raw : -raw;
}

// ─── Eval-week window + STALE split (spec §7.2) ─────────────────────────────

function evalWeekMs(w: EvalWeek): { startMs: number; endMsExclusive: number } {
  const startMs = Date.parse(`${w.start}T00:00:00Z`);
  const endMsExclusive = Date.parse(`${w.end}T00:00:00Z`) + 24 * 3_600_000;
  return { startMs, endMsExclusive };
}

function inWeek(ms: number | null, startMs: number, endMsExclusive: number): boolean {
  return ms != null && ms >= startMs && ms < endMsExclusive;
}

/** §7.2: in-week = triggered_in_week AND resolved_in_week; STALE = either false. */
export function splitInWeekVsStale(
  uniqueTrades: UniqueTradeInput[],
  evalWeek: EvalWeek,
): { inWeek: UniqueTradeInput[]; stale: UniqueTradeInput[] } {
  const { startMs, endMsExclusive } = evalWeekMs(evalWeek);
  const inWeekSet: UniqueTradeInput[] = [];
  const staleSet: UniqueTradeInput[] = [];
  for (const t of uniqueTrades) {
    const trig = inWeek(t.triggerMs, startMs, endMsExclusive);
    const res = inWeek(t.exitMs, startMs, endMsExclusive);
    (trig && res ? inWeekSet : staleSet).push(t);
  }
  return { inWeek: inWeekSet, stale: staleSet };
}

// ─── Session-label honesty (spec §7.3) ──────────────────────────────────────

function etDecimalHour(ms: number): number {
  const h = (ms / 3_600_000 - ET_UTC_OFFSET) % 24;
  return h < 0 ? h + 24 : h;
}

function formatET(ms: number): string {
  // The ET weekday is mandatory: a Friday 02:00Z (Tokyo) fill prints as
  // "22:00 ET" — without the weekday ("Thu 22:00 ET") it reads as a phantom
  // post-close Friday fill (the GA audit's EU 1.14572 ambiguity).
  const etMs = ms - ET_UTC_OFFSET * 3_600_000;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(etMs).getUTCDay()];
  const h = etDecimalHour(ms);
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${wd} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ET`;
}

function windowAtET(hET: number): string {
  // Non-overlapping resolution: first window whose [start, end) contains hET,
  // scanning in canonical order (NY Overlap wins over NY Open at 08:30-10:00).
  for (const w of SESSION_WINDOWS_ET) {
    if (hET >= w.startET && hET < w.endET) return w.name;
  }
  return 'OFF-SESSION';
}

function windowNamedByLabel(label: string): string | null {
  for (const w of SESSION_WINDOWS_ET) {
    if (label.includes(w.name)) return w.name;
  }
  return null;
}

/**
 * §7.3 — a session label is only honest if the actual fill timestamp falls
 * inside that session's window. "Monday London Open" filled at 14:00 ET is a
 * lie → "Monday London Open (intended) → filled 14:00 ET (NY Close)".
 * No fill timestamp → UNVERIFIED. No parseable label → UNVERIFIED.
 */
export function sessionLabelHonesty(t: UniqueTradeInput): SessionHonesty {
  const intended = t.intendedSession ?? null;
  const intendedWindow = intended != null ? windowNamedByLabel(intended) : null;
  if (t.triggerMs == null) {
    return {
      intendedLabel: intended, intendedWindow, actualSession: 'UNVERIFIED', fillET: null,
      honest: false,
      honestLabel: intended != null ? `${intended} (UNVERIFIED — no fill timestamp)` : 'UNVERIFIED (no fill timestamp)',
    };
  }
  const actual = windowAtET(etDecimalHour(t.triggerMs));
  const fillET = formatET(t.triggerMs);
  const honest = intendedWindow != null && actual === intendedWindow;
  const honestLabel = honest
    ? intended as string
    : intended != null
      ? `${intended} (intended) → filled ${fillET} (${actual})`
      : `filled ${fillET} (${actual})`;
  return { intendedLabel: intended, intendedWindow, actualSession: actual, fillET, honest, honestLabel };
}

// ─── Stats blocks (spec §6.2 — unique set only, n on everything) ───────────

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round1(v: number): number { return Math.round(v * 10) / 10; }

function statsBlock(trades: ReportTrade[]): StatsBlock {
  const resolved = trades.filter(t => t.outcome === 'WIN' || t.outcome === 'LOSS');
  const wins = resolved.filter(t => t.outcome === 'WIN');
  const totalR = resolved.reduce((s, t) => s + (t.realizedR ?? 0), 0);
  const avgRrr = wins.length > 0 ? wins.reduce((s, t) => s + t.plannedRrr, 0) / wins.length : 0;
  return {
    n: resolved.length,
    total: trades.length,
    wins: wins.length,
    losses: resolved.length - wins.length,
    winRate: resolved.length > 0 ? round1((wins.length / resolved.length) * 100) : 0,
    totalR: round2(totalR),
    avgRrr: round2(avgRrr),
  };
}

/** §6.2 + §6.3 + §7 — the full accurate report on the unique trade set. */
export function computeAccurateStats(uniqueTrades: UniqueTradeInput[], evalWeek: EvalWeek): AccurateReport {
  const { startMs, endMsExclusive } = evalWeekMs(evalWeek);
  const split = splitInWeekVsStale(uniqueTrades, evalWeek);
  const inWeekIds = new Set(split.inWeek.map(t => t.trade_id));
  const bucketN = (id: string): number => (inWeekIds.has(id) ? split.inWeek.length : split.stale.length);

  const trades: ReportTrade[] = uniqueTrades.map(t => ({
    ...t,
    staggeredEntries: t.staggeredEntries.map(l => ({ ...l })),
    provenance: [...t.provenance],
    blendedEntry: blendedEntryOf(t),
    realizedR: realizedROf(t),
    plannedRrr: plannedRrrOf(t),
    triggered_in_week: inWeek(t.triggerMs, startMs, endMsExclusive),
    resolved_in_week: inWeek(t.exitMs, startMs, endMsExclusive),
    n: bucketN(t.trade_id),
    sessionHonesty: sessionLabelHonesty(t),
  }));

  const inWeekTrades = trades.filter(t => inWeekIds.has(t.trade_id));
  const staleTrades = trades.filter(t => !inWeekIds.has(t.trade_id));
  const triggeredTrades = trades.filter(t => t.triggered_in_week);

  const perPair: Record<string, { headline: StatsBlock; overall: StatsBlock }> = {};
  for (const pair of [...new Set(trades.map(t => t.pair))].sort()) {
    const ofPair = trades.filter(t => t.pair === pair);
    perPair[pair] = {
      headline: statsBlock(ofPair.filter(t => inWeekIds.has(t.trade_id))),
      overall: statsBlock(ofPair),
    };
  }

  return {
    evalWeek,
    uniqueTradeCount: trades.length,
    headline: statsBlock(inWeekTrades),
    inWeekTriggered: statsBlock(triggeredTrades),
    overall: statsBlock(trades),
    staleCount: staleTrades.length,
    perPair,
    inWeek: inWeekTrades,
    stale: staleTrades,
    trades,
  };
}

// ─── SL_vs_ENTRY dedup (spec §6.4 — votes on unique trades only) ───────────

export type SLvsEntryClass = 'SL_TOO_WIDE' | 'ENTRY_TOO_EARLY' | 'BALANCED';

export interface SLvsEntryVoteRow {
  pair: string;
  direction: Direction;
  anchorPrice: number;   // the row's entry (the zone anchor)
  day: string;           // ISO 'YYYY-MM-DD'
  outcome: 'WIN' | 'LOSS';
  maePips: number;
  slDistPips: number;
}

export interface SLvsEntryUniqueVote {
  identity: string;
  pair: string;
  outcome: 'WIN' | 'LOSS';
  util: number;
  classification: SLvsEntryClass;
  rowsCollapsed: number;  // how many raw rows this one unique vote replaces
}

export interface SLvsEntryDedupResult {
  rawCount: number;
  rawTally: Record<SLvsEntryClass, number>;
  uniqueCount: number;
  uniqueTally: Record<SLvsEntryClass, number>;
  uniqueVotes: SLvsEntryUniqueVote[];
}

const ANCHOR_TOLERANCE_PIPS = 3; // §1.2 — the canonical zone-alignment tolerance

function classify(util: number): SLvsEntryClass {
  if (util < 0.40) return 'SL_TOO_WIDE';
  if (util > 0.70) return 'ENTRY_TOO_EARLY';
  return 'BALANCED';
}

function emptyTally(): Record<SLvsEntryClass, number> {
  return { SL_TOO_WIDE: 0, ENTRY_TOO_EARLY: 0, BALANCED: 0 };
}

/**
 * §6.4 — the SL-wide vs entry-early analysis on the UNIQUE set. Rows sharing
 * the dedup identity (pair|dir|anchorBucket±3p|day) vote ONCE (first row
 * wins — feed the real trade's row before its duplicate re-emissions). The
 * embellished "SL TOO WIDE=25" collapses to its honest unique count (the GU
 * ×10 votes → 1).
 */
export function dedupSLvsEntry(rows: SLvsEntryVoteRow[]): SLvsEntryDedupResult {
  const rawTally = emptyTally();
  const byIdentity = new Map<string, { first: SLvsEntryVoteRow; count: number }>();
  for (const r of rows) {
    const util = r.slDistPips > 0 ? r.maePips / r.slDistPips : 0;
    rawTally[classify(util)]++;
    const pip = PIP_VALUE[r.pair] ?? 0.0001;
    const bucket = Math.round(r.anchorPrice / (ANCHOR_TOLERANCE_PIPS * pip));
    const id = `${r.pair}|${r.direction}|${bucket}|${r.day}`;
    const existing = byIdentity.get(id);
    if (existing) existing.count++;
    else byIdentity.set(id, { first: r, count: 1 });
  }
  const uniqueTally = emptyTally();
  const uniqueVotes: SLvsEntryUniqueVote[] = [];
  for (const [identity, { first, count }] of [...byIdentity.entries()].sort()) {
    const util = first.slDistPips > 0 ? first.maePips / first.slDistPips : 0;
    const cls = classify(util);
    uniqueTally[cls]++;
    uniqueVotes.push({ identity, pair: first.pair, outcome: first.outcome, util: round2(util), classification: cls, rowsCollapsed: count });
  }
  return { rawCount: rows.length, rawTally, uniqueCount: uniqueVotes.length, uniqueTally, uniqueVotes };
}
