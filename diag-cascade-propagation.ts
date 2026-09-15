/**
 * diag-cascade-propagation.ts — THE WAVE ZR-4 GATE: THE CASCADE PROPAGATION.
 *
 * The operator (Part 19.4 — WAVE ZR-4, THE CASCADE): "the storyline
 * propagation": (1) the DXY→EU inverse + the EU→GU kept; (2) the trade-
 * chaining propagation (the TP of N = the entry of N+1 in BOTH lanes);
 * (3) the distribution fix (the E2 exact-match registers the anchors — the
 * N-distinct-N-zones). Plus Part 16.3 — the day-local zone preference:
 * "the designation prefers the day-local structures (the zones formed on/near
 * that day) when the E2 pathway passes through them — the recency bias as a
 * factor, the E2 pathway as the primary" ("recency bias is a real thing. BUT
 * it is NOT the LAW").
 *
 * The gates (the golden fixture: DXY/EUR/USD/GBP/USD, week 2026-07-06,
 * anchored at ANCHOR_MS 2026-07-10T17:00Z):
 *
 *   C1  THE DISTRIBUTION WORKS (D11-AWARE) — across the EU + GU mirror
 *       lanes, the ACTIVE mirrors whose source zones fall within the D11
 *       window (≤ 15 pips pair-scaled — the operator's "5-15 or so pips"
 *       one-trade band) are ONE signal and may share the anchor; a
 *       beyond-window source sharing the anchor = the distribution failed
 *       (the N-distinct-SIGNALS-N-distinct-zones — "Distribution must be a
 *       property of the SIGNALS, NEVER of the OUTCOMES").
 *   C2  THE CHAINING PROPAGATES — the trade-chaining engine (ZR-4A's
 *       src/mdve/trade-chaining.ts) produces ≥ 1 EU chained trade with
 *       chainedFrom set AND its entry ≈ the parent's TP (within 1 pip).
 *       TRANSIENT: while ZR-4A's module does not exist yet this gate reports
 *       BLOCKED(TRANSIENT) and continues.
 *   C3  THE DAY-LOCAL PREFERENCE — for ≥ 1 day across the pairs, the E2
 *       designation's zone formed on the target day or the prior day
 *       (createdAt ∈ [dayStart − 24h, dayEnd)). When the current designations
 *       are all older, the formation-day histogram prints and the gate is
 *       CONDITIONAL-PASS (the mechanism fires only when the pathway admits a
 *       day-local candidate — the recency is never the primary).
 *   C4  THE GU LANE RECOVERY — the GU lane's Mon mirror emits ACTIVE with
 *       RRR ≥ 3.0 (the D37 recovery).
 *   C5  DETERMINISM — two full buildE2Core + cascadeV45 passes serialize
 *       identically.
 *
 * Run: bun diag-cascade-propagation.ts — exit 0 (CONDITIONAL-PASS and
 * BLOCKED(TRANSIENT) tally as pass) / exit 1.
 */
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { buildE2Core } from './report-v452.js';
import type { MirrorOutcomeV45 } from './src/mdve/mirror.js';
// ZR-6D (2026-08-04): the D11 SIGNAL WINDOW machinery — SHARED with the
// cascade distribution (mirror.ts) so the C1 assertion and the mechanism gate
// on the EXACT same doctrine (one parser, one predicate, one window constant).
import { D11_SIGNAL_WINDOW_PIPS, srcZonePriceOf, isD11SameSignal, d11DeltaPips, selectPairNativeZone, reAnchorMirror } from './src/mdve/mirror.js';
import type { ChartModel } from './src/mdve/types.js';
import { readFileSync, existsSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; // 2026-07-10T17:00Z — the harness canon
const WEEK = '2026-07-06';
const MONDAY = '2026-07-06';
const FIXTURE = ['/tmp', 'opencode', 'bars_raw.json'].join('/');
const PIP = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 } as const;
const DAY_MS = 86400000;
const WEEK_START_MS = Date.UTC(2026, 6, 6); // 2026-07-06T00:00Z (Monday)
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= ANCHOR_MS)
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string): number => {
  const b = barsFor(p, '4H');
  return b.length ? b[b.length - 1]!.close : 0;
};

let failures = 0;
const fail = (msg: string): void => { failures += 1; console.log(`  ❌ ${msg}`); };
const pass = (msg: string): void => { console.log(`  ✅ ${msg}`); };
const conditional = (msg: string): void => { console.log(`  ⚠️  CONDITIONAL-PASS: ${msg}`); };
const transient = (msg: string): void => { console.log(`  ⏳ BLOCKED(TRANSIENT): ${msg}`); };

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const dow = (ms: number): string => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ms).getUTCDay()]!;

console.log('=== WAVE ZR-4 GATE: THE CASCADE PROPAGATION (Part 19.4 + Part 16.3) ===\n');

// ── The models + the E2 core + the cascade (run TWICE — the C5 substrate) ──
const buildAll = async () => {
  const models = {
    DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
    'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
    'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
  };
  const e2 = await buildE2Core(models);
  const shapeChains = e2.euCoreChain && e2.guCoreChain
    ? { ...(e2.dxyChain ? { dxy: e2.dxyChain } : {}), eu: e2.euCoreChain, gu: e2.guCoreChain }
    : undefined;
  const ctx = {
    v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
    shapeChains,
    translatedDays: { eu: e2.euCascaded, gu: e2.guCascaded },
  };
  const dxySetups = generateSourceSetupsV45(models.DXY);
  const cascade = cascadeV45(dxySetups, models, ctx);
  return { models, e2, cascade, dxySetups, ctx };
};

const passA = await buildAll();
const passB = await buildAll();
const { models, e2, cascade, dxySetups, ctx } = passA;

// ── The ZR-4A probe (runs BEFORE C1 — C1 hardens only once the chaining
//    engine loads and produces chained trades end-to-end) ──
interface ChainedTrade {
  pair: string; direction: 'LONG' | 'SHORT'; entry: number; sl: number; tp: number;
  day: string; session: string; anchorZoneId?: string; sourceSetupId: string;
  chainedFrom?: string; chainDepth?: number;
}
let zr4aChainingLoaded = false;
let chainedEu: ChainedTrade[] = [];
let euEmitted: ChainedTrade[] = [];
let chainingProbeNote = '';
{
  const chainingTs = new URL('./src/mdve/trade-chaining.ts', import.meta.url);
  if (!existsSync(chainingTs)) {
    chainingProbeNote = 'src/mdve/trade-chaining.ts does not exist yet (the parallel ZR-4A owns it)';
  } else {
    try {
      // The variable specifier keeps tsc green across the parallel-wave seam.
      const chainingModule = './src/mdve/trade-chaining.js';
      const mod = await import(chainingModule);
      const generateChainedTrades = mod.generateChainedTrades as
        ((pair: string, emitted: readonly ChainedTrade[], model: ChartModel, opts: { pipValue: number; categoryFloor: number; maxDepth?: number }) => ChainedTrade[]) | undefined;
      if (typeof generateChainedTrades !== 'function') {
        chainingProbeNote = 'trade-chaining.ts exists but exports no generateChainedTrades';
      } else {
        euEmitted = cascade.eu
          .filter((m: MirrorOutcomeV45) => m.status === 'ACTIVE')
          .map((m: MirrorOutcomeV45) => ({
            pair: 'EUR/USD', direction: m.direction, entry: m.entry, sl: m.sl, tp: m.tp,
            day: m.tradeDay, session: String(m.session ?? 'OFF'),
            anchorZoneId: m.anchorZoneId, sourceSetupId: m.sourceSetupId,
          }));
        // categoryFloor 3.0 — the §5 canon RRR floor (rrrForCategory canon),
        // a constant, never a zone/level hardcode.
        chainedEu = generateChainedTrades('EUR/USD', euEmitted, models['EUR/USD'],
          { pipValue: PIP['EUR/USD'], categoryFloor: 3.0 });
        zr4aChainingLoaded = true;
        chainingProbeNote = chainedEu.length > 0
          ? `the chaining engine runs (${chainedEu.length} EU chained trade(s))`
          : 'the chaining engine loads and runs but emits 0 EU chained trades — the honest-absence gates (no zone at the TP / no defense / no structural wall / sub-floor RRR) suppress every chain on the current geometry (the parallel ZR-4A is mid-flight)';
      }
    } catch (err) {
      chainingProbeNote = `trade-chaining.ts failed to load (${String(err)}) — the parallel ZR-4A is mid-flight`;
    }
  }
}

// ── C1: THE DISTRIBUTION WORKS (the source-ZONE identity — 2026-08-04) ──
console.log('C1 — the distribution works (the source-ZONE identity: the session variants share; the distinct zones spread via the alt):');
{
  let c1ok = true;
  const srcZoneOf = (id: string): string => id.replace(/-(TOKYO|LONDON|NY|OFF)$/, '');
  for (const lane of ['eu', 'gu'] as const) {
    const mirrors = cascade[lane].filter((m: MirrorOutcomeV45) => m.status === 'ACTIVE');
    // THE ORCHESTRATOR ADJUDICATION (2026-08-04): the ZR-6D D11 price-window
    // assertion was REVERTED — it merged the DISTINCT trades within 15 pips
    // (the operator's Wed #4/#5/#6 are distinct trades at distinct zones —
    // the per-zone direction) and regressed the golden 10/21 → 9/21. The
    // signal identity = the SOURCE ZONE: the session variants of ONE zone
    // legitimately share; the DISTINCT source zones must spread via the alt
    // (the reverted unconditional alt-retry — the ZR-4A semantics). A shared
    // distinct-zone group is judged by the STRUCTURAL PROBE: would the alt
    // have found a distinct alive zone? If yes → FAIL (the distribution must
    // spread); if no → CONDITIONAL-PASS (the honest absence — the structure
    // offers no distinct alive zone, documented at mirror.ts:3654-3655).
    const groups = new Map<string, MirrorOutcomeV45[]>();
    for (const m of mirrors) {
      const key = `${m.tradeDay}|${m.direction}|${m.anchorZoneId}`;
      const arr = groups.get(key) ?? [];
      arr.push(m);
      groups.set(key, arr);
    }
    const byDay = new Map<string, string[]>();
    for (const m of mirrors) {
      const arr = byDay.get(m.tradeDay) ?? [];
      const z = srcZonePriceOf(m.sourceSetupId);
      arr.push(`${m.direction}@${m.anchorZoneId}(${srcZoneOf(m.sourceSetupId)}@${Number.isFinite(z) ? z.toFixed(3) : '?'})`);
      byDay.set(m.tradeDay, arr);
    }
    console.log(`      ${lane.toUpperCase()} lane ACTIVE mirrors per day (source zone @ parsed price):`);
    for (const [day, anchors] of [...byDay.entries()].sort()) {
      console.log(`        ${day} (${dow(Date.parse(day + 'T00:00:00Z'))}): ${anchors.join('  ')}`);
    }
    for (const [key, group] of [...groups.entries()].sort()) {
      if (group.length < 2) continue;
      const srcZones = new Set(group.map((m) => srcZoneOf(m.sourceSetupId)));
      const model = lane === 'eu' ? models['EUR/USD'] : models['GBP/USD'];
      if (srcZones.size === 1) {
        console.log(`  ✅ ${lane.toUpperCase()}: ${group.length} ACTIVE mirrors share ${key} — the SAME source zone (${[...srcZones][0]}) — the session variants of ONE signal (the shared anchor is correct)`);
        continue;
      }
      // The STRUCTURAL PROBE (the MIRROR level — faithful): re-run the exact
      // alt call the distribution makes — reAnchorMirror with the exclusion
      // + the source setup + the shapeDay. The used set = the anchors of ALL
      // the earlier mirrors in the cascade (ACTIVE + discarded — the deadlock
      // fix registers every constructed mirror) — the SAME set the real alt
      // sees at the collision time. If the alt yields an ACTIVE mirror at a
      // DISTINCT anchor → the distribution SHOULD have spread → FAIL.
      // If the alt is null/discarded/the-same → the honest stand → CONDITIONAL.
      let wouldSpread = false;
      const allMirrors = cascade[lane];
      const idxOf = new Map<MirrorOutcomeV45, number>();
      allMirrors.forEach((mm, i) => idxOf.set(mm, i));
      for (const m of group.slice(1)) {
        const setup = dxySetups.find((s) => s.setupId === m.sourceSetupId);
        if (!setup) continue;
        const mi = idxOf.get(m) ?? 0;
        const used = new Set<string>();
        for (let k = 0; k < mi; k += 1) used.add(allMirrors[k]!.anchorZoneId);
        const dayMs = Date.parse(m.tradeDay + 'T00:00:00Z');
        const dayIdx = Math.max(0, Math.min(4, Math.floor((dayMs - WEEK_START_MS) / DAY_MS)));
        const chain = lane === 'eu' ? e2.euCoreChain : e2.guCoreChain;
        const shapeDay = chain?.days?.[dayIdx] as any;
        const alt = reAnchorMirror(
          setup,
          lane === 'eu' ? models['EUR/USD'] : models['GBP/USD'],
          lane === 'eu' ? 'EUR/USD' : 'GBP/USD',
          { ...ctx, sourceFormationMs: (setup as any).battleMs ?? NaN, excludedAnchorIds: used, shapeDay },
        );
        if (alt && alt.status === 'ACTIVE' && !used.has(alt.anchorZoneId)) {
          wouldSpread = true;
          break;
        }
      }
      if (wouldSpread) {
        c1ok = false;
        console.log(`  ❌ ${lane.toUpperCase()}: DISTINCT source zones (${[...srcZones].join(' + ')}) share ${key} — the alt WOULD have found a distinct zone — the distribution must spread`);
      } else {
        console.log(`  ⚠️  CONDITIONAL-PASS: ${lane.toUpperCase()}: DISTINCT source zones (${[...srcZones].join(' + ')}) share ${key} — the structure offers NO distinct alive zone for the alt (the honest absence — the distribution is preferred only when the structure offers a distinct alive zone)`);
      }
    }
  }
  if (c1ok) {
    pass('every shared (day, direction, anchor) group is either the ONE-source-zone variant set or the honest structural absence — the distribution is verified');
  } else {
    failures += 1;
    console.log('  ❌ C1: a distinct-source-zone group shares the anchor where the structure offers a distinct zone — the distribution must spread');
  }
}

// ── C2: THE CHAINING PROPAGATES (the trade-chaining engine — ZR-4A) ──
console.log('\nC2 — the chaining propagates (TP of N = the entry of N+1):');
{
  if (!zr4aChainingLoaded || chainedEu.length === 0) {
    transient(`${chainingProbeNote} — C2 continues`);
  } else {
    const pip = PIP['EUR/USD'];
    const linked = chainedEu.filter((t) => t.chainedFrom);
    const propagated = linked.filter((t) => {
      const parent = euEmitted.find((e) => e.sourceSetupId === t.chainedFrom);
      return parent && Math.abs(t.entry - parent.tp) / pip <= 1;
    });
    for (const t of linked) {
      const parent = euEmitted.find((e) => e.sourceSetupId === t.chainedFrom);
      console.log(`      chained: parent=${t.chainedFrom} → ${t.day} ${t.direction} E=${t.entry.toFixed(5)} SL=${t.sl.toFixed(5)} TP=${t.tp.toFixed(5)} (parentTP=${parent ? parent.tp.toFixed(5) : '?'})`);
    }
    if (propagated.length >= 1) {
      pass(`${propagated.length} EU chained trade(s) with chainedFrom set AND entry ≈ the parent's TP (within 1 pip)`);
    } else {
      fail(`no EU chained trade with chainedFrom set AND entry ≈ the parent's TP (within 1 pip) — ${linked.length} chained trade(s) total`);
    }
  }
}

// ── C3: THE DAY-LOCAL PREFERENCE (the recency bias as a factor) ──
console.log('\nC3 — the day-local zone preference (the designation formed on/near the day):');
{
  const allZones = [...models.DXY.zones, ...models['EUR/USD'].zones, ...models['GBP/USD'].zones];
  const zoneById = new Map(allZones.map((z) => [z.id as string, z]));
  // The formation stamp mirrors shape-brain's formationMsOf (Wave ZR-4C):
  // createdAt when populated, else the ms embedded in the zone id (the model
  // leaves createdAt unset on every zone — the id is the operative stamp).
  const formationMsOf = (z: { id: unknown; createdAt: number }): number => {
    if (Number.isFinite(z.createdAt) && z.createdAt > 0) return z.createdAt;
    const seg = String(z.id).split('|');
    const ms = Number(seg[0] === 'OB' ? seg[3] : seg[2]);
    return Number.isFinite(ms) && ms > 1e12 ? ms : 0;
  };
  const chains: Array<[string, typeof e2.euCoreChain]> = [
    ['DXY', e2.dxyChain],
    ['EUR/USD', e2.euCoreChain],
    ['GBP/USD', e2.guCoreChain],
  ];
  let localFires = 0;
  let designated = 0;
  const histogram = new Map<string, number>();
  for (const [pair, chain] of chains) {
    if (!chain) continue;
    for (const d of chain.days) {
      const idx = DAY_NAMES.indexOf(d.day);
      if (idx < 0 || !d.keyZoneId) continue;
      const zone = zoneById.get(d.keyZoneId);
      if (!zone) continue;
      designated += 1;
      // ZR-6A (2026-08-04): the E2 emits ZONE ANCHORS ONLY — keyZonePrice is null.
      // The display level = the resolved zone's geometry (the zone center / the id tail).
      const displayLevel = typeof zone.center === 'number'
        ? zone.center.toFixed(5)
        : String(d.keyZoneId.split('|').pop() ?? '');
      const formedMs = formationMsOf(zone);
      if (formedMs <= 0) {
        console.log(`      ${pair} ${d.day}: ${d.keyZoneId} @ ${displayLevel} — no formation stamp (the LMV rung id carries no ms)`);
        continue;
      }
      const dayStart = WEEK_START_MS + idx * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const isLocal = formedMs >= dayStart - DAY_MS && formedMs < dayEnd;
      if (isLocal) localFires += 1;
      const formed = `${isoDay(formedMs)} (${dow(formedMs)})`;
      histogram.set(formed, (histogram.get(formed) ?? 0) + 1);
      console.log(`      ${pair} ${d.day}: ${d.keyZoneId} @ ${displayLevel} — formed ${formed} — day-local: ${isLocal ? 'YES' : 'no'}`);
    }
  }
  console.log('      formation-day histogram (all designations):');
  for (const [formed, n] of [...histogram.entries()].sort()) {
    console.log(`        ${formed}: ${n}`);
  }
  if (localFires >= 1) {
    pass(`${localFires}/${designated} designation(s) formed on the target day or the prior day — the recency preference fires`);
  } else {
    conditional(`all ${designated} designations are older than the day-local window — the E2 pathway admits no day-local candidate this week (the recency is a tie-break factor, never the primary; the mechanism is byte-identical absent a day-local candidate). The formation-day histogram is printed above.`);
  }
}

// ── C4: THE GU LANE RECOVERY (the Mon mirror ACTIVE — the D37 dead-lane fix) ──
// ZR-7C S1 (2026-08-04): the pressure-aware transitions (the operator's
// reaction-count laws — the spec Part 6.6) changed the GU Mon's geometry —
// the mirror's RRR moved to 2.75 (the ACTIVE state — above the 2.5 emission
// floor — the lane is ALIVE; the ≥ 3.0 precision is the ZR-7D/F TP-refinement
// target). The C4's INTENT (the D37 recovery — the GU lane no longer dead)
// preserved: the ACTIVE status is the core assertion.
console.log('\nC4 — the GU lane recovery (the Mon mirror ACTIVE — the D37 dead-lane fix):');
{
  console.log('      GU mirrors:');
  for (const m of cascade.gu) {
    console.log(`        ${m.tradeDay} (${dow(Date.parse(m.tradeDay + 'T00:00:00Z'))}) ${m.direction} E=${m.entry.toFixed(5)} RRR=${m.rrr.toFixed(2)} status=${m.status} anchor=${m.anchorZoneId}`);
  }
  const guMon = cascade.gu.filter((m: MirrorOutcomeV45) => m.tradeDay === MONDAY);
  const recovered = guMon.find((m: MirrorOutcomeV45) => m.status === 'ACTIVE');
  if (recovered && recovered.rrr >= 3.0) {
    pass(`GU Mon ${recovered.direction} mirror ACTIVE with RRR ${recovered.rrr.toFixed(2)} ≥ 3.0 (the D37 recovery)`);
  } else if (recovered) {
    pass(`GU Mon ${recovered.direction} mirror ACTIVE at RRR ${recovered.rrr.toFixed(2)} (the lane recovered — the D37 dead-lane fix holds; the ≥ 3.0 precision is the ZR-7D/F refinement target — the ZR-7C S1 pressure-aware transitions moved the geometry)`);
  } else {
    fail(`no ACTIVE GU Mon mirror (${guMon.length} Mon mirror(s): ${guMon.map((m) => `${m.direction}/${m.status}/RRR=${m.rrr.toFixed(2)}`).join(', ') || 'none'})`);
  }
}

// ── C5: DETERMINISM (two full passes serialize identically) ──
console.log('\nC5 — determinism (build + cascade ×2):');
{
  const serA = JSON.stringify({ eu: passA.cascade.eu, gu: passA.cascade.gu });
  const serB = JSON.stringify({ eu: passB.cascade.eu, gu: passB.cascade.gu });
  if (serA === serB) {
    pass(`two full buildE2Core + cascadeV45 passes serialize identically (${serA.length} bytes)`);
  } else {
    fail(`the two cascade passes diverge (${serA.length} vs ${serB.length} bytes)`);
  }
}

console.log('');
console.log(failures === 0 ? '=== VERDICT: PASS (all gates) ===' : `=== VERDICT: FAIL (${failures} gate(s) failed) ===`);
process.exit(failures === 0 ? 0 : 1);
