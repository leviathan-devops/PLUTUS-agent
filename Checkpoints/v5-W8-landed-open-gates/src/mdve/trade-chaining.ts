/**
 * MDVE Trade Chaining — the Law-27 propagation engine (Wave ZR-4A; ZR-6D
 * extends the chain to the operator's full structure — the Wed triple + the
 * Thu→Fri chains, depth 3).
 *
 * LAW 27 (the operator, verbatim): "TP OF ONE = ENTRY OF NEXT. BS → R:
 * TP of BS becomes R entry zone. BS → WL: TP of BS becomes WL entry zone.
 * WL → RWL: TP of WL becomes RWL entry zone."
 *
 * The operator's EU chains (Golden_Operator_Trade_Feedback_EU_GU.md):
 *   #2 Mon LONG  E 1.14110 = #1's TP  ("Set E at the TP level of trade #1")
 *   #4 Wed LONG  E 1.14020 = #3's TP  ("E sitting at the TP of the BS")
 *   #5 Wed SHORT E 1.14295 = #4's TP  ("set E at the TP of trade #4")
 *   #8 Fri SHORT E 1.14555 = #7's TP  ("E at the 1.618 level that was TP of trade #7")
 *
 * THE E1→E2→E3 CONSTRAINT: the chained reaction trade CONSUMES the E1
 * zone map (the reaction zone at the parent's TP), the ZR-1 operative
 * defense (the ladder-steps SL, ZR-3A) and the ZR-3 strength-driven TP
 * (the first STRUCTURAL opposing wall). It NEVER fabricates a level —
 * every anchor traces to an E1 zone; honest absence (no zone at the TP,
 * no defense, no structural wall, sub-floor RRR) means the chain is not
 * emitted — never forced.
 *
 * THE REACTION DIRECTION: the chained trade is the OPPOSITE direction of
 * its parent — price reverses off the TP zone (the BS hits TP at the
 * demand zone → the R is the LONG reaction off that demand).
 *
 * ADDITIVE BY CONSTRUCTION: the engine reads the emitted primaries and
 * EMITS new rows; it never mutates an input. The in-engine identity
 * dedup (§1.2 canon: pair|dir|anchor ±3p|day — the SAME anchorBucket the
 * frozen dedup engine consumes) guarantees no chained row can merge into
 * a primary inside dedupTrades (the primaries stay byte-identical).
 *
 * Determinism: no wall-clock, no Math.random, sorted iteration, pure
 * calendar arithmetic on ISO day strings.
 */

import type { ChartModel, ZoneModel } from './types.js';
import {
  computeLadderStepsSL,
  classifyZoneStrength,
  isStructuralWall,
} from './mirror.js';
/** The Law-13 realism ceiling for chained trades (2026-08-04): the operator's
 *  chained trades run 3-11R; a chained RRR beyond this targets an unrealistic
 *  far wall (the TP > ~15× the SL) that fills and stops. */
export const MAX_CHAIN_RRR = 15;
import { anchorBucket } from './trade-dedup.js';

// ═══════════════════════════════════════════════════════════════════════════════
// THE CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChainedTradeInput {
  pair: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  sl: number;
  tp: number;
  day: string;
  session: string;
  anchorZoneId?: string;
  sourceSetupId: string;
  chainedFrom?: string; // the parent trade's sourceSetupId (set on chained outputs)
  chainDepth?: number; // 0 = the primary, 1+ = the chained generation
}

export interface ChainedTradeOpts {
  pipValue: number;
  categoryFloor: number; // the RRR floor (3.0 via rrrForCategory)
  // ZR-6D (2026-08-04): the chain depth extends to 3 — the operator's Wed
  // triple (EU #4 → #5 → #6: "set E at the TP of trade #4" then the
  // #5→#6 reaction) runs THREE generations. The honest gates bound it — the
  // RRR floor, the structural-wall absence, the week's end, and the §1.2
  // identity dedup all suppress an invalid extension; the depth is a CEILING,
  // never a mandate (a 1-deep chain where only one reaction is honest stays
  // 1-deep). MAX_CHAIN_RRR (15) stays the Law-13 realism ceiling.
  maxDepth?: number; // default 3 (the operator's chains run 1-3 deep)
}

/** The canonical session order (deterministic sort + the day rule). */
const SESSION_ORDER: Record<string, number> = { TOKYO: 0, LONDON: 1, NY: 2, OFF: 3 };

/**
 * The primary's session class drives the chained trade's day (TASK 1.7):
 * a London/early primary's reaction plausibly fires the SAME day (the
 * operator's #1→#2 same Monday); a NY/late primary's reaction is the
 * NEXT day (the #3 Tue → #4 Wed chain). Unknown/absent sessions take the
 * conservative next-day branch.
 */
function isLateSession(session: string): boolean {
  if (/NY|OFF/.test(session)) return true;
  if (/TOKYO|LONDON|London/.test(session)) return false;
  return true; // unknown → conservative next-day
}

/**
 * The chained trade's session: the next reaction window after the
 * parent's. Same-day chain (early parent) → the NY window; next-day
 * chain (late parent) → the next London window (the scalps react at
 * London, the swings at NY — the operator's weekly rhythm).
 */
function chainedSessionOf(sameDay: boolean): string {
  return sameDay ? 'NY' : 'LONDON';
}

/**
 * Pure ISO-day arithmetic (deterministic — no wall-clock). The next
 * TRADING day: Saturday rolls +2 to Monday, Sunday +1 (the FX week runs
 * Mon–Fri; a Friday-NY parent's chain belongs to the next week's Monday).
 */
function nextTradingDay(isoDay: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!m) return isoDay; // unparseable → unchanged (the caller guards '')
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + 24 * 3_600_000;
  const dow = new Date(ms).getUTCDay(); // 6 = Sat, 0 = Sun
  const rolled = new Date(dow === 6 ? ms + 2 * 24 * 3_600_000 : dow === 0 ? ms + 24 * 3_600_000 : ms);
  return rolled.toISOString().slice(0, 10);
}

/**
 * The §1.2 identity (the frozen dedup engine's canon): pair|dir|
 * anchorBucket(entry)|day. Seeding the primaries' identities into the
 * engine's seen-set is what makes the chaining ADDITIVE-SAFE — a chained
 * trade that would collide with a primary (or an already-minted chained
 * trade) is suppressed, so dedupTrades can never merge a chained row
 * into a primary's stagger group (the primaries stay byte-identical).
 */
function chainIdentity(pair: string, direction: 'LONG' | 'SHORT', anchor: number, day: string): string {
  return `${pair}|${direction}|${anchorBucket(anchor, pair)}|${day}`;
}

/**
 * The entry zone at the chained entry (the parent's TP): every E1 zone
 * containing the price, EXCLUDING the institutional-overlay IP bands
 * (§8.1: "confluence/ZFP/context + SL/TP rungs, NEVER entries"). The
 * opposing-type zone is preferred (a LONG reaction anchors on the DEMAND
 * zone at the TP; a SHORT on the SUPPLY), then the strongest pressure:
 * BoM over MoM, lowest zfp, highest confluence — the deterministic id
 * tiebreak closes the total order.
 */
function selectEntryZone(model: ChartModel, entry: number, chainedDir: 'LONG' | 'SHORT'): ZoneModel | null {
  const wantType = chainedDir === 'LONG' ? 'DEMAND' : 'SUPPLY';
  const containing = model.zones.filter(
    (z) => !z.id.startsWith('IP|') && z.bottom <= entry && entry <= z.top,
  );
  if (containing.length === 0) return null;
  const sorted = [...containing].sort((a, b) => {
    const aType = a.type === wantType ? 0 : 1;
    const bType = b.type === wantType ? 0 : 1;
    if (aType !== bType) return aType - bType;
    const aCls = a.classification === 'BoM' ? 0 : 1;
    const bCls = b.classification === 'BoM' ? 0 : 1;
    if (aCls !== bCls) return aCls - bCls;
    if (a.zfp !== b.zfp) return a.zfp - b.zfp;
    if (a.confluence !== b.confluence) return b.confluence - a.confluence;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return sorted[0]!;
}

/**
 * The chained TP: the first STRUCTURAL opposing wall beyond the entry
 * (the ZR-3.4 doctrine — shallow LMV shelves and IP bands are
 * pass-through, never the terminal), priced by the ZR-3.2 strength
 * ladder: STRONG → the close edge minus/plus the 1.5p spread; WEAK → the
 * far edge; MIDDLE → the near edge (the approach edge — the
 * defendedEdge equivalent for an S/D ZoneModel). No structural wall →
 * honest absence (the chain is not emitted).
 */
function chainedTargetTp(model: ChartModel, entry: number, chainedDir: 'LONG' | 'SHORT', pipValue: number): number | null {
  const wantType = chainedDir === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const walls = model.zones
    .filter((z) => {
      if (z.id.startsWith('LMV|')) return false;
      if (z.id.startsWith('IP|')) return false;
      if (z.type !== wantType) return false;
      if (!isStructuralWall(z)) return false;
      return chainedDir === 'LONG' ? z.bottom > entry : z.top < entry;
    })
    .sort((a, b) =>
      (chainedDir === 'LONG' ? a.bottom - b.bottom : b.top - a.top) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const wall = walls[0];
  if (!wall) return null;
  const strength = classifyZoneStrength(wall);
  if (strength === 'STRONG') return chainedDir === 'LONG' ? wall.bottom - 1.5 * pipValue : wall.top + 1.5 * pipValue;
  if (strength === 'WEAK') return chainedDir === 'LONG' ? wall.top : wall.bottom;
  return chainedDir === 'LONG' ? wall.bottom : wall.top;
}

/**
 * chainOne — the single-generation Law-27 propagation. Every honest
 * absence (no zone at the TP, no operative defense, no structural
 * target, degenerate geometry, sub-floor RRR) yields no emission.
 */
function chainOne(parent: ChainedTradeInput, model: ChartModel, opts: Required<ChainedTradeOpts>): ChainedTradeInput | null {
  if (!Number.isFinite(parent.tp) || !Number.isFinite(parent.entry) || parent.day === '') return null;

  // 1. the reaction is the OPPOSITE direction off the TP zone
  const chainedDir: 'LONG' | 'SHORT' = parent.direction === 'LONG' ? 'SHORT' : 'LONG';
  // 2. Law 27 — the TP of trade N = the entry of trade N+1
  const chainedEntry = parent.tp;

  // 3. the E1 entry zone at the TP (honest absence → no emission)
  const entryZone = selectEntryZone(model, chainedEntry, chainedDir);
  if (!entryZone) return null;

  // 4. the ladder-steps SL (ZR-3A via the ZR-1 operative defense)
  const slRes = computeLadderStepsSL(model, entryZone.id, chainedEntry, chainedDir, opts.pipValue, {});
  if (!slRes) return null;
  const chainedSL = slRes.sl;

  // 5. the strength-driven TP at the nearest STRONG opposing structure
  const chainedTP = chainedTargetTp(model, chainedEntry, chainedDir, opts.pipValue);
  if (chainedTP === null) return null;

  // structural sanity: the SL/TP must sit on the correct sides
  if (chainedDir === 'LONG' && (chainedSL >= chainedEntry || chainedTP <= chainedEntry)) return null;
  if (chainedDir === 'SHORT' && (chainedSL <= chainedEntry || chainedTP >= chainedEntry)) return null;

  // 6. the honest RRR gate — never force a sub-floor chain — + the Law-13
  //    realism ceiling (2026-08-04): a chained TP at RRR > MAX_CHAIN_RRR
  //    targets an unrealistic far wall (the TP distance > ~15× the SL) —
  //    "TP > 2×weeklyATR = ambitious, > 3× = reject" (Law 13). The operator's
  //    chained trades are 3-11R; the RRR 20-30 chains fill and stop (the GU
  //    LONGs at 1.34957). Reject them — never a fabricate-to-win far target.
  const risk = Math.abs(chainedEntry - chainedSL);
  if (risk <= 0) return null;
  const rrr = Math.abs(chainedTP - chainedEntry) / risk;
  if (rrr < opts.categoryFloor) return null;
  if (rrr > MAX_CHAIN_RRR) return null;

  // 7. the day/session propagation (early parent → same day, late → next)
  const sameDay = !isLateSession(parent.session);
  const day = sameDay ? parent.day : nextTradingDay(parent.day);
  const session = chainedSessionOf(sameDay);

  // 8. the provenance chain
  const depth = (parent.chainDepth ?? 0) + 1;
  return {
    pair: parent.pair,
    direction: chainedDir,
    entry: chainedEntry,
    sl: chainedSL,
    tp: chainedTP,
    day,
    session,
    anchorZoneId: entryZone.id,
    sourceSetupId: `CHAIN-${parent.sourceSetupId}-D${depth}`,
    chainedFrom: parent.sourceSetupId,
    chainDepth: depth,
  };
}

/**
 * generateChainedTrades — the Law-27 engine. For each emitted primary
 * with a clear TP, mint the chained reaction trade (entry = the parent's
 * TP, direction = the reversal), validate it against the E1 zone map +
 * the RRR floor, then recurse (BFS) to maxDepth. The §1.2 identity dedup
 * runs IN-ENGINE: a chained trade colliding with a primary or an
 * already-minted chained trade is suppressed — the emitted set can enter
 * dedupTrades without ever merging into a primary's group.
 */
export function generateChainedTrades(
  pair: string,
  emitted: readonly ChainedTradeInput[],
  model: ChartModel,
  opts: ChainedTradeOpts,
): ChainedTradeInput[] {
  const full: Required<ChainedTradeOpts> = { maxDepth: 3, ...opts };
  const seen = new Set<string>();
  for (const t of emitted) seen.add(chainIdentity(pair, t.direction, t.entry, t.day));

  const sessionRank = (s: string): number => {
    for (const k of Object.keys(SESSION_ORDER)) if (s.includes(k)) return SESSION_ORDER[k]!;
    if (/London/.test(s)) return SESSION_ORDER.LONDON!;
    if (/NY/.test(s)) return SESSION_ORDER.NY!;
    return 4;
  };
  const queue: ChainedTradeInput[] = [...emitted].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      sessionRank(a.session) - sessionRank(b.session) ||
      (a.sourceSetupId < b.sourceSetupId ? -1 : a.sourceSetupId > b.sourceSetupId ? 1 : 0),
  );

  const out: ChainedTradeInput[] = [];
  while (queue.length > 0) {
    const parent = queue.shift()!;
    if ((parent.chainDepth ?? 0) >= full.maxDepth) continue;
    const chained = chainOne(parent, model, full);
    if (!chained) continue;
    const id = chainIdentity(pair, chained.direction, chained.entry, chained.day);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(chained);
    queue.push(chained); // recurse — the chained trade is itself a parent
  }
  return out;
}
