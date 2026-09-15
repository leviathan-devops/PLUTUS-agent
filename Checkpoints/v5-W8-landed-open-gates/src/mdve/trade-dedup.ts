/**
 * MDVE Trade Dedup — the v4.5.2 stats-integrity engine
 * (PLUTUS_V4.5.2_SPEC §1 identity + §2 staggered-entry merge + §3.2 blended
 * RRR + §4 EU/GU anchor dedup / emission cap / consumed-pool re-admission /
 * upstream zone-pool dedup + Appendix B normative pseudocode, EXACT).
 *
 * ═══════════════════════════════════════════════════════════════
 * THE DEFECT (§1.1): v4.5.1 deduped on (pair, dir, day, SESSION,
 * entry-bucket) — so the same zone reacting in London AND NY counted as
 * TWO trades, stagger legs E1/E2/E3 counted as THREE trades, and N DXY
 * sources mapping to ONE EU/GU anchor counted as N trades (the GU ×10).
 * The audit (INDEPENDENT_AUDIT_v452): 36 rows = 13 unique trades
 * (DXY 7, EU 5, GU 1); count inflated 2.77×, total R 2.34×.
 *
 * THE CANON (operator doctrine 2026-07-29, §1.2):
 *   identity = (pair, dir, zone_anchor ± 3 pips, day) — NO session
 *   component. The zone+day IS the trade. Session variants are ONE
 *   trade whose fills are the staggered legs (frozen 0.33/0.33/0.34
 *   ladder, ONE SL, ONE TP, blended entry). Different days = DISTINCT
 *   (multi-day reactions are legitimate — never blanket-deduped).
 *
 * DETERMINISM LAW: no wall-clock, no randomness. Group iteration is
 * identity-sorted (Appendix B); leg order is (triggerMs, entry, setupId)
 * — a TOTAL order. Same rows → byte-identical JSON.
 * ═══════════════════════════════════════════════════════════════
 */

import { PIP_VALUE } from '../types.js';
import { PIP_VALUE_DEFAULT } from '../constants/trading-constants.js';
import type { TradeSetup } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Anchor tolerance = 3 pips per pair (§1.3).
 * BECAUSE: 3 pips is the canonical zone-alignment tolerance (the scaffold's
 * dedup tolerance + the LQZ align tolerance, canon lqz-lobe.ts:185). It
 * groups the staggered entries of ONE zone (e.g. 100.869/100.871/100.874
 * inside the 100.845 shelf's ~4-pip width) into one anchor bucket WITHOUT
 * over-merging adjacent golden rungs (4-10 pips apart).
 */
export const ANCHOR_TOLERANCE_PIPS: Record<string, number> = {
  'DXY': 3, 'EUR/USD': 3, 'GBP/USD': 3, 'AUD/USD': 3,
};

/** Tolerance for pairs not in the table (§1.2 — the table is uniform 3). */
export const DEFAULT_ANCHOR_TOLERANCE_PIPS = 3;

/**
 * The frozen stagger ladder weights (§2.2 — E1 front 0.33, E2 mid 0.33,
 * E3 back 0.34). Beyond E3 (anchor-duplicate groups > 3, e.g. the GU ×10)
 * each extra leg weighs 0.34 per Appendix B, and the blend NORMALIZES by
 * Σweight — see mergeGroup's DEVIATION note.
 */
export const STAGGER_WEIGHTS: readonly number[] = [0.33, 0.33, 0.34];

/**
 * Per-anchor emission cap (§4.2): a mirror anchor (an EU/GU zone) emits
 * AT MOST ONE mirror trade per day. Additional DXY sources mapping to the
 * same anchor+day MERGE (provenance), never emit separately. This is the
 * mechanical kill for the GU ×10 (§4.1).
 */
export const MAX_MIRRORS_PER_ANCHOR_PER_DAY = 1;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The dedup-facing setup shape. The pipeline's TradeSetup carries `day` as
 * a weekday-name display string and no ISO day / trigger ms / zone anchor —
 * the §9.1 wiring supplies those via toDedupSetup(). The report parser in
 * verify-dedup.ts constructs this shape directly.
 */
export interface DedupSetup {
  setupId: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  sl: number;
  tp: number;
  /** The trading day (YYYY-MM-DD) of the anchor zone's relevance (§1.2). */
  day: string;
  /** Session label — PROVENANCE ONLY (§1.2: NO session component in identity). */
  session?: string;
  /** First-trigger ms — the leg-ordering key (§2.2 chronological merge). */
  triggerMs?: number;
  /** The LQZ/S-D anchor zone. defendedEdge is the identity's anchor price. */
  entryZone?: { defendedEdge?: number };
}

/** One stagger leg (§2.2 — E1/E2/E3, the trade's fill ladder). */
export interface StaggerLeg {
  leg: string;                 // 'E1' | 'E2' | 'E3' | ...
  entry: number;               // the leg's actual entry price
  weight: number;              // the frozen ladder weight
  session?: string;            // provenance: which session this leg came from
  triggerMs?: number;
  setupId: string;             // provenance: the merged source row
}

/** The deduplicated trade (§6.3 mandatory fields subset owned by PKG-DEDUP). */
export interface UniqueTrade extends DedupSetup {
  trade_id: string;            // the dedup identity: pair|dir|anchorBucket|day
  is_staggered: boolean;
  staggeredEntries: StaggerLeg[];
  /** The merged source row ids, ' + '-joined, chronological (§2.2). */
  provenance: string;
  /** How many source rows merged into this trade (1 = no merge). */
  mergedRowCount: number;
}

export interface DroppedDuplicate {
  setupId: string;
  trade_id: string;
  reason: 'ANCHOR_DUPLICATE' | 'STAGGER_LEG_MERGE' | 'EMISSION_CAP' | 'ZONE_POOL_DUPLICATE';
  detail: string;
}

export interface DedupStats {
  inputRows: number;
  uniqueTrades: number;
  droppedDuplicateRows: number;
  staggeredGroups: number;
  maxGroupSize: number;
  perPair: Record<string, { rows: number; unique: number; dropped: number }>;
}

export interface DedupResult {
  uniqueTrades: UniqueTrade[];
  droppedDuplicates: DroppedDuplicate[];
  stats: DedupStats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §1 — THE DEDUP IDENTITY
// ═══════════════════════════════════════════════════════════════════════════════

/** The identity's anchor price (§1.2): the LMV defendedEdge, or the entry. */
export function anchorOf(setup: DedupSetup): number {
  return setup.entryZone?.defendedEdge ?? setup.entry;
}

/** anchorBucket = round(anchor / (tolPips × PIP[pair])) (§1.2, Appendix B). */
export function anchorBucket(anchorPrice: number, pair: string): number {
  const pip = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
  const tol = (ANCHOR_TOLERANCE_PIPS[pair] ?? DEFAULT_ANCHOR_TOLERANCE_PIPS) * pip;
  return Math.round(anchorPrice / tol);
}

/**
 * tradeIdentity(setup) = `${pair}|${direction}|${anchorBucket}|${day}`.
 * NO session component — the zone+day IS the trade (§1.2 canon).
 */
export function tradeIdentity(setup: DedupSetup): string {
  return `${setup.pair}|${setup.direction}|${anchorBucket(anchorOf(setup), setup.pair)}|${setup.day}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §2 — THE STAGGERED-ENTRY MERGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * mergeGroup(group, id) → ONE UniqueTrade (§2.2, Appendix B — EXACT):
 *   legs      = group sorted chronologically → E1/E2/E3 with the frozen
 *               0.33/0.33/0.34 weights (the fill ladder, not trades);
 *   entry     = the blended entry Σ(weightᵢ × entryᵢ);
 *   sl / tp   = the FIRST leg's SL/TP — ONE SL (the structural anchor),
 *               ONE TP (the Law-14 walk target); all legs share them;
 *   provenance = the merged source row ids.
 *
 * DEVIATION (documented, spec-faithful): Appendix B's blend is the RAW sum
 * Σ wᵢeᵢ. For the canonical ≤3-leg stagger Σw = 1.00 and the raw sum is the
 * weighted mean — EXACT. For >3-leg anchor-duplicate groups (the GU ×10)
 * the raw sum is arithmetically broken (10 identical entries e blend to
 * 3.4×e — a price outside the legs' range). The blend therefore NORMALIZES
 * by Σw: identical to the spec for every ≤3-leg group, and the only honest
 * value for the duplicate groups the audit demands merge to ONE trade.
 *
 * The leg sort is TOTAL (triggerMs, entry, setupId) — byte-identical output
 * for ties (the EU 1.14389 rows sharing a session timestamp).
 */
function mergeGroup(group: readonly DedupSetup[], id: string): UniqueTrade {
  const sorted = [...group].sort(
    (a, b) =>
      (a.triggerMs ?? 0) - (b.triggerMs ?? 0) ||
      a.entry - b.entry ||
      (a.setupId < b.setupId ? -1 : a.setupId > b.setupId ? 1 : 0),
  );
  const legs: StaggerLeg[] = sorted.map((s, i) => ({
    leg: `E${i + 1}`,
    entry: s.entry,
    weight: STAGGER_WEIGHTS[i] ?? 0.34,
    session: s.session,
    triggerMs: s.triggerMs,
    setupId: s.setupId,
  }));
  const weightSum = legs.reduce((sum, l) => sum + l.weight, 0);
  const blendedEntry = legs.reduce((sum, l) => sum + l.entry * l.weight, 0) / weightSum;
  const first = sorted[0]!;
  return {
    ...first,
    trade_id: id,
    is_staggered: legs.length > 1,
    staggeredEntries: legs,
    entry: blendedEntry,
    sl: first.sl,                 // ONE SL — the first leg's structural SL (§2.2)
    tp: first.tp,                 // ONE TP — the first leg's Law-14 target (§2.2)
    provenance: sorted.map((s) => s.setupId).join(' + '),
    mergedRowCount: group.length,
  };
}

/**
 * dedupTrades(setups) — group by identity, merge each group to ONE trade
 * (§1 + §2). Groups iterate in sorted-identity order (Appendix B:
 * deterministic). Rows that merged away are named in droppedDuplicates
 * (ANCHOR_DUPLICATE when all legs share one entry price — the GU ×10
 * pattern; STAGGER_LEG_MERGE when the legs carry distinct entries).
 */
export function dedupTrades(setups: readonly DedupSetup[]): DedupResult {
  const groups = new Map<string, DedupSetup[]>();
  for (const s of setups) {
    const id = tradeIdentity(s);
    const g = groups.get(id);
    if (g) g.push(s);
    else groups.set(id, [s]);
  }

  const uniqueTrades: UniqueTrade[] = [];
  const droppedDuplicates: DroppedDuplicate[] = [];
  for (const [id, group] of [...groups.entries()].sort()) {
    uniqueTrades.push(mergeGroup(group, id));
    if (group.length > 1) {
      const allSameEntry = group.every((s) => s.entry === group[0]!.entry);
      for (const s of group.slice(1)) {
        droppedDuplicates.push({
          setupId: s.setupId,
          trade_id: id,
          reason: allSameEntry ? 'ANCHOR_DUPLICATE' : 'STAGGER_LEG_MERGE',
          detail: allSameEntry
            ? `byte-equivalent row for ${id} — merged as a stagger leg, not a trade (§4.1)`
            : `session/stagger variant of ${id} — merged as a leg of ONE trade (§2.2)`,
        });
      }
    }
  }

  const pairStats = new Map<string, { rows: number; unique: number; dropped: number }>();
  for (const s of setups) {
    const p = pairStats.get(s.pair) ?? { rows: 0, unique: 0, dropped: 0 };
    p.rows += 1;
    pairStats.set(s.pair, p);
  }
  for (const t of uniqueTrades) {
    pairStats.get(t.pair)!.unique += 1;
    pairStats.get(t.pair)!.dropped += t.mergedRowCount - 1;
  }

  return {
    uniqueTrades,
    droppedDuplicates,
    stats: {
      inputRows: setups.length,
      uniqueTrades: uniqueTrades.length,
      droppedDuplicateRows: droppedDuplicates.length,
      staggeredGroups: uniqueTrades.filter((t) => t.is_staggered).length,
      maxGroupSize: uniqueTrades.reduce((m, t) => Math.max(m, t.mergedRowCount), 0),
      perPair: Object.fromEntries([...pairStats.entries()].sort()),
    },
  };
}

/**
 * blendedRrr(trade) — the staggered trade's R-multiple (§3.2, the frozen
 * blend): Σᵢ weightᵢ × |tp − entryᵢ| / |entryᵢ − sl|, normalized by Σweight
 * (same documented normalization as the blended entry). A non-staggered
 * trade reduces to its plain RRR.
 */
export function blendedRrr(trade: UniqueTrade): number {
  const legs = trade.staggeredEntries.length > 0
    ? trade.staggeredEntries
    : [{ leg: 'E1', entry: trade.entry, weight: 1, setupId: trade.setupId }];
  const weightSum = legs.reduce((sum, l) => sum + l.weight, 0);
  return (
    legs.reduce((sum, l) => {
      const risk = Math.abs(l.entry - trade.sl);
      if (risk === 0) return sum; // degenerate leg: zero risk → contributes nothing
      return sum + l.weight * (Math.abs(trade.tp - l.entry) / risk);
    }, 0) / weightSum
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4.2/§4.3 — THE PER-ANCHOR EMISSION CAP (the GU ×10 kill)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmissionCapResult {
  kept: DedupSetup[];
  dropped: DroppedDuplicate[];
}

/**
 * capMirrorEmission(mirrors) — enforce MAX_MIRRORS_PER_ANCHOR_PER_DAY = 1.
 * The cap key is (pair, anchor bucket, day) — the FX anchor, NEVER the DXY
 * source setup id (§4.2/§4.3): N DXY sources mapping to ONE EU/GU anchor+day
 * produce ONE emission. The FIRST mirror (input order = strongest
 * provenance, §4.2) is kept; the rest drop with logged reasons (the audit's
 * `emissions_per_anchor` metric made visible, FIX 4).
 */
export function capMirrorEmission(mirrors: readonly DedupSetup[]): EmissionCapResult {
  const seen = new Set<string>();
  const kept: DedupSetup[] = [];
  const dropped: DroppedDuplicate[] = [];
  for (const m of mirrors) {
    const key = `${m.pair}|${anchorBucket(anchorOf(m), m.pair)}|${m.day}`;
    if (seen.has(key)) {
      dropped.push({
        setupId: m.setupId,
        trade_id: tradeIdentity(m),
        reason: 'EMISSION_CAP',
        detail: `anchor ${anchorOf(m)} already emitted for ${m.pair} on ${m.day} — ` +
          `MAX_MIRRORS_PER_ANCHOR_PER_DAY=${MAX_MIRRORS_PER_ANCHOR_PER_DAY} (§4.2)`,
      });
      continue;
    }
    seen.add(key);
    kept.push(m);
  }
  return { kept, dropped };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4.4 — THE CONSUMED-POOL RE-ADMISSION QUALIFIER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConsumedPoolCandidate {
  pair: string;
  anchorPrice: number;
  day: string;
  /** Rejection-anatomy battles at this anchor within the week (§4.4.2). */
  battlesInWeek: number;
  /** The re-anchored SL clears the anchor's wick range (§4.4.3). */
  volatilityCleared: boolean;
}

export interface ReadmissionVerdict {
  admitted: boolean;
  reasons: string[];
}

/**
 * qualifyConsumedPoolReadmission(c) — a consumed-but-recently-battled anchor
 * (the v4.5.x R2 pool-loosening, e.g. the GU 1.34337 supply battled 3×)
 * re-enters the pool ONLY when (§4.4):
 *   2. it has ≥1 rejection-anatomy battle within the week (REACTIVE, not
 *      merely consumed — battle evidence required), AND
 *   3. the re-anchored SL is vol-cleared (clears the anchor's wick range).
 * Requirement 1 (the per-day emission cap) is enforced separately by
 * capMirrorEmission — the two compose: admitted ∧ capped.
 */
export function qualifyConsumedPoolReadmission(c: ConsumedPoolCandidate): ReadmissionVerdict {
  const reasons: string[] = [];
  if (c.battlesInWeek < 1) {
    reasons.push(`anchor ${c.anchorPrice} (${c.pair}) has ${c.battlesInWeek} rejection-anatomy ` +
      `battles this week — consumed ≠ REACTIVE, re-admission denied (§4.4.2)`);
  }
  if (!c.volatilityCleared) {
    reasons.push(`re-anchored SL does not clear the wick range of ${c.anchorPrice} (${c.pair}) — ` +
      `volatilityClear failed (§4.4.3)`);
  }
  const admitted = reasons.length === 0;
  if (admitted) {
    reasons.push(`anchor ${c.anchorPrice} (${c.pair}) battled ${c.battlesInWeek}× this week and is ` +
      `vol-cleared — REACTIVE, re-admitted (emission still capped at ` +
      `${MAX_MIRRORS_PER_ANCHOR_PER_DAY}/day, §4.4.1)`);
  }
  return { admitted, reasons };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4.5 — THE UPSTREAM ZONE-POOL DEDUP
// ═══════════════════════════════════════════════════════════════════════════════

export interface ZonePoolZone {
  zoneId: string;
  pair: string;
  /** The zone's class label (e.g. 'SUPPLY' | 'DEMAND' | 'IP Supply'). */
  class: string;
  /** The zone's anchor price (defendedEdge / reactionExtreme / center). */
  anchorPrice: number;
}

/**
 * dedupZonePool(zones) — the v4.4 zone map lists the same zone up to 3×
 * (audit finding 10: "IP Supply 101.2277" ×2, "IP Demand 100.8347" ×3) —
 * the ROOT GENERATOR of downstream trade duplication. Zones dedup by
 * (pair, class, anchor bucket) at the 3-pip tolerance (§4.5, the scaffold's
 * dedup rule) BEFORE the mirror + setup generation consume them. First
 * occurrence wins (input order = provenance); the rest drop with reasons.
 */
export function dedupZonePool<T extends ZonePoolZone>(
  zones: readonly T[],
): { unique: T[]; dropped: DroppedDuplicate[] } {
  const seen = new Set<string>();
  const unique: T[] = [];
  const dropped: DroppedDuplicate[] = [];
  for (const z of zones) {
    const key = `${z.pair}|${z.class}|${anchorBucket(z.anchorPrice, z.pair)}`;
    if (seen.has(key)) {
      dropped.push({
        setupId: z.zoneId,
        trade_id: key,
        reason: 'ZONE_POOL_DUPLICATE',
        detail: `zone ${z.zoneId} duplicates an earlier ${z.class} zone at anchor ` +
          `${z.anchorPrice} (${z.pair}) within the 3-pip tolerance (§4.5)`,
      });
      continue;
    }
    seen.add(key);
    unique.push(z);
  }
  return { unique, dropped };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §1.4 — THE CI ASSERTION (the regression guard)
// ═══════════════════════════════════════════════════════════════════════════════

/** The report shape the CI assertion guards (rows = emitted rows). */
export interface DedupReport {
  rows: readonly DedupSetup[];
  uniqueTrades: readonly UniqueTrade[];
}

export interface NamedDuplicate {
  setupId: string;
  trade_id: string;
}

/** The error thrown by assertRowCountIntegrity — carries the named duplicates. */
export class RowCountIntegrityError extends Error {
  readonly duplicates: readonly NamedDuplicate[];
  constructor(message: string, duplicates: readonly NamedDuplicate[]) {
    super(message);
    this.name = 'RowCountIntegrityError';
    this.duplicates = duplicates;
  }
}

export function isRowCountIntegrityError(e: unknown): e is RowCountIntegrityError {
  return e instanceof RowCountIntegrityError;
}

/**
 * assertRowCountIntegrity(report) — §1.4: |output.rows| == |output.uniqueTrades|
 * for every report. A session-variant or anchor-duplicate producing a second
 * row for the same trade_id+day FAILS THE BUILD. On mismatch the thrown
 * RowCountIntegrityError NAMES every duplicate row (the rows beyond the
 * first per identity). This assertion catches all 23 duplicate rows the
 * audit found (6 DXY + 7 EU + 10 GU). It also FAILS when the counts happen
 * to match but the identity multisets differ (a disguised mismatch).
 */
export function assertRowCountIntegrity(report: DedupReport): void {
  const rowIds = report.rows.map((r) => tradeIdentity(r));
  const counts = new Map<string, number>();
  for (const id of rowIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  const duplicates: NamedDuplicate[] = [];
  const seenOnce = new Set<string>();
  for (const r of report.rows) {
    const id = tradeIdentity(r);
    if (seenOnce.has(id)) duplicates.push({ setupId: r.setupId, trade_id: id });
    else seenOnce.add(id);
  }

  const uniqueIds = report.uniqueTrades.map((t) => t.trade_id);
  const rowMultiset = [...rowIds].sort().join('');
  const uniqueMultiset = [...uniqueIds].sort().join('');

  if (report.rows.length !== report.uniqueTrades.length || rowMultiset !== uniqueMultiset) {
    throw new RowCountIntegrityError(
      `ROW-COUNT INTEGRITY FAIL (§1.4): |rows|=${report.rows.length} != ` +
      `|uniqueTrades|=${report.uniqueTrades.length} — ${duplicates.length} duplicate row(s): ` +
      duplicates.map((d) => `${d.setupId} [${d.trade_id}]`).join('; '),
      duplicates,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §9.1 — THE INTEGRATION ADAPTER (TradeSetup → DedupSetup)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * toDedupSetup(setup, dayIso, opts) — the §9.1 wiring adapter. The pipeline's
 * TradeSetup carries `day` as a weekday-name display string; the dedup
 * identity needs the ISO trading day (YYYY-MM-DD of the anchor zone's
 * relevance, §1.2) supplied by the caller (the pipeline owns the battle
 * timestamps). `anchor` is the zone's defendedEdge when known (the identity
 * anchor); absent → the entry (§1.2 fallback). Direction is normalized
 * through a total predicate — no type assertions.
 */
export function toDedupSetup(
  setup: TradeSetup,
  dayIso: string,
  opts?: { triggerMs?: number; anchor?: number },
): DedupSetup {
  const d = String(setup.direction).toUpperCase();
  return {
    setupId: setup.setupId,
    pair: setup.pair,
    direction: d === 'LONG' ? 'LONG' : 'SHORT',
    entry: setup.entry,
    sl: setup.sl,
    tp: setup.tp,
    day: dayIso,
    session: String(setup.session),
    triggerMs: opts?.triggerMs,
    entryZone: opts?.anchor !== undefined ? { defendedEdge: opts.anchor } : undefined,
  };
}
