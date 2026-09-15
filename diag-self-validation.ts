/**
 * diag-self-validation.ts — THE WAVE ZR-5.2 GATE: THE MACHINE SELF-VALIDATION
 * PROTOCOL (MACRO_CONTEXT Part 30, lines 992-1003).
 *
 * The operator's ruling (verbatim): "The agent/codebase must be able to self
 * validate based on RULES and LOGIC not a hardcoded data set." This gate
 * validates the pipeline's OWN output via internal-consistency RULES — the
 * protocol that eventually REPLACES the golden anchor (Part 30: "The golden
 * anchor (the diag-golden-coverage's `golden` const) is TEMPORARY
 * ARCHITECTURE — the measurement oracle for the Phase-1 optimization ONLY").
 * NOTHING in this file reads the golden const. Every assertion derives from
 * the fixture's bars → the models → the E2 core → the cascade — the machine
 * auditing its OWN trades with rules + logic.
 *
 * The four Part-30 layers mapped to six gates:
 *
 *   SV1  E1 CONSISTENCY — every zone in all 3 models carries a pressure
 *        state (lifecycle defined, mitigationCount ≥ 0) derived from the
 *        bars: ≥ 95% of zones stamped AND the lifecycle distribution
 *        non-degenerate (not all VIRGIN, not all BROKEN). "The zone map's
 *        levels emerge from the week's OWN data — different week, different
 *        map, same rules."
 *   SV2  E2 CONSISTENCY — every pair's storyline (computeWeekStoryline via
 *        buildE2Core's barsByPairTf lane) has 5 days, each with a non-empty
 *        projectedNext.trigger + narrative; every contestedZone (when
 *        present) resolves to a REAL model zone (the id exists in
 *        model.zones — the anti-fabrication floor).
 *   SV3  E3 GEOMETRY RULES — for every ACTIVE emitted trade (the cascade
 *        mirrors + the DXY source setups): (a) the entry traces to an E1
 *        zone (the anchorZoneId resolves in the model OR the entry sits
 *        within a model zone's band ±2p); (b) the SL is direction-sane
 *        (SHORT: sl > entry; LONG: sl < entry); (c) the TP on the opposing
 *        side; (d) RRR ≥ the 2.5 category floor. HARD-FAIL: a direction-
 *        insane SL/TP or a fabricated entry zone. FINDINGS (printed, not
 *        auto-failed): entries at NON-model levels via the golden-SL path.
 *   SV4  THE E1→E2→E3 CONSTRAINT — every ACTIVE mirror's anchorZoneId
 *        resolves to a model zone (exact id OR the LMV center-tail
 *        normalization — the mirror's `pair|LMV|center` vs the model's
 *        bridged `LMV|pair|center`) AND its tradeDay maps to an E2 chain
 *        day (the shapeDay projection). An orphan = a fabricated level =
 *        HARD-FAIL.
 *   SV5  THE CASCADE VALIDATION — the EU/GU storyline alignment: the
 *        computeChainDivergence values (EU core vs DXY-inverse cascade, GU
 *        core vs EU cascade) report VALIDATED (≤ 0.35); the structural-
 *        equivalence matching prints per-mirror (the same-element zoneClass
 *        + the inverse/kept direction).
 *   SV6  DETERMINISM — build + cascade ×2; the emitted trades + the
 *        storylines serialize identically (§12 Law 2 — no wall-clock, no
 *        Math.random).
 *
 * Fixture: /tmp/opencode/bars_raw.json — DXY/EUR/USD/GBP/USD 1H/4H/30m/15m,
 * week 2026-07-06, anchored at ANCHOR_MS (2026-07-10T17:00Z) — the harness
 * canon (identical to diag-cascade-propagation / diag-storyline).
 *
 * Run: bun diag-self-validation.ts — exit 0 (all gates) / exit 1.
 */
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { buildE2Core } from './report-v452.js';
import type { MirrorOutcomeV45 } from './src/mdve/mirror.js';
import type { ChartModel, ZoneModel } from './src/mdve/types.js';
import type { TradeSetup } from './src/types.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; // 2026-07-10T17:00Z — the harness canon
const WEEK = '2026-07-06';
const FIXTURE = ['/tmp', 'opencode', 'bars_raw.json'].join('/');
const PIP = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 } as const;
const PAIRS = ['DXY', 'EUR/USD', 'GBP/USD'] as const;
const RRR_FLOOR = 2.5; // the operator's 2026-08-04 flat doctrine floor — "anything that is 2.5 RR or above is valid"; a constant, never a level hardcode
const BAND_TOL_PIPS = 2; // the SV3(a) band-containment tolerance (±2p)

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
const finding = (msg: string): void => { console.log(`  🔎 FINDING: ${msg}`); };
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const dow = (ms: number): string => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ms).getUTCDay()]!;
const DAY_NAME_OF_ISO = (iso: string): string => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(iso + 'T00:00:00Z').getUTCDay()]!;

// ── Zone-resolution helpers (the anti-fabrication floor) ──
/** Exact id OR the LMV center-tail normalization: the mirror's anchor id is
 *  `pair|LMV|<center>` while the model's bridged rung id is
 *  `LMV|<pair>|<center>` — an LMV rung IS its center (mirror.ts:1463-1473
 *  normalizes both forms to the numeric tail). */
const resolveZone = (model: ChartModel, anchorZoneId: string): ZoneModel | null => {
  const exact = model.zones.find((z) => z.id === anchorZoneId);
  if (exact) return exact;
  if (anchorZoneId.includes('LMV|')) {
    const tail = anchorZoneId.split('|').pop() ?? '';
    if (tail.length > 0) {
      const byTail = model.zones.find((z) => z.id.includes('LMV|') && (z.id.split('|').pop() ?? '') === tail);
      if (byTail) return byTail;
    }
  }
  return null;
};
/** The entry sits within a model zone's band ± tol (the OB zones AND the
 *  bridged LMV rungs — both live in model.zones). */
const entryInBand = (model: ChartModel, entry: number, tolPips: number, pip: number): ZoneModel | null => {
  const tol = tolPips * pip;
  const containing = model.zones
    .filter((z) => entry >= z.bottom - tol && entry <= z.top + tol)
    .sort((a, b) =>
      (Math.abs((a.top + a.bottom) / 2 - entry) - Math.abs((b.top + b.bottom) / 2 - entry)) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return containing.length > 0 ? containing[0]! : null;
};

console.log('=== WAVE ZR-5.2 GATE: THE MACHINE SELF-VALIDATION PROTOCOL (Part 30 — RULES + LOGIC, never the golden const) ===\n');

// ── The models + the E2 core + the cascade (run TWICE — the SV6 substrate) ──
// The barsByPairTf argument activates buildE2Core's ZR-2B storyline lane
// (additive — the cascade-ctx wiring is byte-identical to diag-cascade-
// propagation; the storyline record feeds SV2/SV6).
const buildAll = async () => {
  const models = {
    DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
    'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
    'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
  };
  const barsByPairTf: Record<string, Record<string, OHLCBar[]>> = {
    DXY: { '1H': barsFor('DXY', '1H') },
    'EUR/USD': { '1H': barsFor('EUR/USD', '1H') },
    'GBP/USD': { '1H': barsFor('GBP/USD', '1H') },
  };
  const e2 = await buildE2Core(models, undefined, barsByPairTf);
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
  return { models, e2, dxySetups, cascade };
};

const passA = await buildAll();
const passB = await buildAll();
const { models, e2, dxySetups, cascade } = passA;

// ── SV1: E1 CONSISTENCY (the pressure states derived from the bars) ──
console.log('\nSV1 — E1 consistency (≥95% of zones pressure-stamped; the lifecycle distribution non-degenerate):');
{
  let sv1ok = true;
  for (const p of PAIRS) {
    const model = models[p];
    const zones = model.zones;
    const stamped = zones.filter((z) =>
      z.pressure !== undefined &&
      typeof z.pressure.lifecycle === 'string' && z.pressure.lifecycle.length > 0 &&
      Number.isFinite(z.pressure.mitigationCount) && z.pressure.mitigationCount >= 0);
    const pct = zones.length > 0 ? (stamped.length / zones.length) * 100 : 0;
    const hist = new Map<string, number>();
    for (const z of stamped) hist.set(z.pressure!.lifecycle, (hist.get(z.pressure!.lifecycle) ?? 0) + 1);
    const histStr = [...hist.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l}:${n}`).join(' ');
    const allVirgin = stamped.length > 0 && hist.size === 1 && hist.has('VIRGIN');
    const allBroken = stamped.length > 0 && hist.size === 1 && hist.has('BROKEN');
    console.log(`      ${p}: ${stamped.length}/${zones.length} zones stamped (${pct.toFixed(1)}%) — lifecycle histogram: ${histStr || 'EMPTY'}`);
    if (pct < 95) {
      sv1ok = false;
      console.log(`      ❌ ${p}: only ${pct.toFixed(1)}% of zones carry a pressure state (< 95%)`);
    }
    if (allVirgin || allBroken) {
      sv1ok = false;
      console.log(`      ❌ ${p}: the lifecycle distribution is DEGENERATE (${allVirgin ? 'all VIRGIN — no battles read' : 'all BROKEN — no defense read'})`);
    }
  }
  if (sv1ok) {
    pass('all 3 models: ≥95% of zones pressure-stamped from the bars AND every lifecycle distribution non-degenerate (the zone map emerges from the week\'s OWN data)');
  } else {
    failures += 1;
    console.log('  ❌ SV1: the E1 pressure states are not internally consistent (see the per-pair evidence above)');
  }
}

// ── SV2: E2 CONSISTENCY (the storyline projections internally consistent) ──
console.log('\nSV2 — E2 consistency (5 days/pair, non-empty trigger + narrative, contested zones resolve to REAL model zones):');
{
  let sv2ok = true;
  for (const p of PAIRS) {
    const model = models[p];
    const st = e2.storylines[p];
    if (!st) {
      sv2ok = false;
      console.log(`      ❌ ${p}: NO storyline computed (the brain returned null — the E2 core is absent, not honest)`);
      continue;
    }
    const zoneIds = new Set(model.zones.map((z) => z.id));
    console.log(`      ${p}: warframe=${st.warframePhase} strength=${st.strengthComparison.verdict} days=${st.days.length}`);
    console.log('        day        shape  contested-zone (resolves)');
    if (st.days.length !== 5) {
      sv2ok = false;
      console.log(`      ❌ ${p}: expected 5 days, got ${st.days.length}`);
    }
    for (const d of st.days) {
      const triggerOk = typeof d.projectedNext?.trigger === 'string' && d.projectedNext.trigger.length > 0;
      const narrativeOk = typeof d.narrative === 'string' && d.narrative.length > 0;
      let contestedOk = true;
      let contestedStr = '—';
      if (d.contestedZone) {
        contestedOk = zoneIds.has(d.contestedZone.zoneId);
        contestedStr = `${d.contestedZone.zoneId} ${contestedOk ? '✓' : '✗ FABRICATED'}`;
        if (!contestedOk) {
          sv2ok = false;
          console.log(`      ❌ ${p} ${d.day}: contestedZone ${d.contestedZone.zoneId} does NOT resolve to a model zone — the anti-fabrication floor`);
        }
      }
      if (!triggerOk || !narrativeOk) {
        sv2ok = false;
        console.log(`      ❌ ${p} ${d.day}: ${!triggerOk ? 'EMPTY projectedNext.trigger' : ''}${!triggerOk && !narrativeOk ? ' + ' : ''}${!narrativeOk ? 'EMPTY narrative' : ''}`);
      }
      console.log(`        ${d.day.padEnd(10)} ${String(d.shape).padEnd(6)} ${contestedStr}`);
    }
  }
  if (sv2ok) {
    pass('all 3 storylines: 5 days, every trigger + narrative non-empty, every contestedZone resolves to a real model zone (zero fabricated storyline zones)');
  } else {
    failures += 1;
    console.log('  ❌ SV2: the E2 storyline projections are not internally consistent (see the per-pair evidence above)');
  }
}

// ── SV3: E3 GEOMETRY RULES (every ACTIVE emitted trade) ──
console.log('\nSV3 — E3 geometry rules (entry traces to an E1 zone; SL/TP direction-sane; RRR ≥ 2.5):');
{
  interface TradeRow {
    id: string; pair: string; direction: string;
    entry: number; sl: number; tp: number; rrr: number;
    anchorZoneId: string | null; lane: string;
  }
  const rows: TradeRow[] = [];
  for (const s of dxySetups) {
    rows.push({
      id: s.setupId, pair: 'DXY', direction: String(s.direction),
      entry: s.entry, sl: s.sl, tp: s.tp, rrr: s.rrr,
      anchorZoneId: null, lane: 'SOURCE',
    });
  }
  for (const m of cascade.eu.filter((x: MirrorOutcomeV45) => x.status === 'ACTIVE')) {
    rows.push({
      id: m.sourceSetupId, pair: 'EUR/USD', direction: m.direction,
      entry: m.entry, sl: m.sl, tp: m.tp, rrr: m.rrr,
      anchorZoneId: m.anchorZoneId, lane: 'EU-MIRROR',
    });
  }
  for (const m of cascade.gu.filter((x: MirrorOutcomeV45) => x.status === 'ACTIVE')) {
    rows.push({
      id: m.sourceSetupId, pair: 'GBP/USD', direction: m.direction,
      entry: m.entry, sl: m.sl, tp: m.tp, rrr: m.rrr,
      anchorZoneId: m.anchorZoneId, lane: 'GU-MIRROR',
    });
  }
  console.log(`      ${rows.length} ACTIVE emitted trades under audit (${dxySetups.length} DXY sources, ${cascade.eu.filter((x: MirrorOutcomeV45) => x.status === 'ACTIVE').length} EU mirrors, ${cascade.gu.filter((x: MirrorOutcomeV45) => x.status === 'ACTIVE').length} GU mirrors)`);
  let hardViolations = 0;
  let findingCount = 0;
  let rrrViolations = 0;
  for (const t of rows) {
    const model = models[t.pair as typeof PAIRS[number]];
    const pip = PIP[t.pair as keyof typeof PIP];
    // (b) + (c) — the direction-sanity floor (the hard anti-fabrication rules).
    const slInsane = t.direction === 'SHORT' ? t.sl <= t.entry : t.direction === 'LONG' ? t.sl >= t.entry : true;
    const tpInsane = t.direction === 'SHORT' ? t.tp >= t.entry : t.direction === 'LONG' ? t.tp <= t.entry : true;
    if (slInsane) {
      hardViolations += 1;
      console.log(`      ❌ ${t.lane} ${t.id} (${t.pair} ${t.direction} E=${t.entry.toFixed(5)} SL=${t.sl.toFixed(5)}): DIRECTION-INSANE SL — the SL is not on the adverse side of the entry`);
    }
    if (tpInsane) {
      hardViolations += 1;
      console.log(`      ❌ ${t.lane} ${t.id} (${t.pair} ${t.direction} E=${t.entry.toFixed(5)} TP=${t.tp.toFixed(5)}): DIRECTION-INSANE TP — the TP is not on the opposing side`);
    }
    // (a) — the entry traces to an E1 zone (the anchor resolves OR the band contains it).
    if (t.lane !== 'SOURCE') {
      const resolved = t.anchorZoneId ? resolveZone(model, t.anchorZoneId) : null;
      const band = entryInBand(model, t.entry, BAND_TOL_PIPS, pip);
      if (!resolved && !band) {
        hardViolations += 1;
        console.log(`      ❌ ${t.lane} ${t.id} (${t.pair} ${t.direction} E=${t.entry.toFixed(5)}): FABRICATED ENTRY — anchorZoneId '${t.anchorZoneId}' resolves to nothing AND no model zone band contains the entry (±${BAND_TOL_PIPS}p)`);
      } else if (!resolved && band) {
        findingCount += 1;
        finding(`${t.lane} ${t.id} (${t.pair} ${t.direction} E=${t.entry.toFixed(5)}): the anchor id '${t.anchorZoneId}' does not resolve but the entry sits inside ${band.id} [${band.bottom.toFixed(5)}-${band.top.toFixed(5)}] — a NON-model-id level (the golden-SL/LMV path — honest report, not auto-fail)`);
      }
    } else {
      const band = entryInBand(model, t.entry, BAND_TOL_PIPS, pip);
      if (!band) {
        findingCount += 1;
        finding(`SOURCE ${t.id} (DXY ${t.direction} E=${t.entry.toFixed(5)}): the entry sits outside every DXY model zone band (±${BAND_TOL_PIPS}p) — a NON-model level via the LMV-refined/golden-SL path (honest report, not auto-fail)`);
      }
    }
    // (d) — the RRR floor (the cascade's own discard rule — a sub-floor ACTIVE
    // row is printed as a violation; the discard machinery is the primary).
    if (t.rrr < RRR_FLOOR) {
      rrrViolations += 1;
      console.log(`      ⚠️  ${t.lane} ${t.id} (${t.pair} ${t.direction}): RRR=${t.rrr.toFixed(2)} < the ${RRR_FLOOR.toFixed(1)} category floor`);
    }
  }
  if (hardViolations === 0) {
    pass(`${rows.length} ACTIVE trades: zero direction-insane SL/TP, zero fabricated entries (${findingCount} non-model-level finding(s) printed, ${rrrViolations} sub-floor RRR violation(s) printed)`);
  } else {
    failures += 1;
    console.log(`  ❌ SV3: ${hardViolations} hard geometry violation(s) (direction-insane SL/TP or fabricated entry — the anti-fabrication floor)`);
  }
}

// ── SV4: THE E1→E2→E3 CONSTRAINT (every anchor traces; every day projects) ──
console.log('\nSV4 — the E1→E2→E3 constraint (every ACTIVE mirror\'s anchor resolves to a model zone + traces to an E2 projection day):');
{
  const chainsByPair: Record<string, { days: Array<{ day: string }> } | null> = {
    'EUR/USD': e2.euCoreChain,
    'GBP/USD': e2.guCoreChain,
  };
  let orphans = 0;
  let noProjection = 0;
  let audited = 0;
  for (const lane of ['eu', 'gu'] as const) {
    const pair = lane === 'eu' ? 'EUR/USD' : 'GBP/USD';
    const model = models[pair];
    const chain = chainsByPair[pair];
    for (const m of cascade[lane].filter((x: MirrorOutcomeV45) => x.status === 'ACTIVE')) {
      audited += 1;
      const resolved = resolveZone(model, m.anchorZoneId);
      if (!resolved) {
        orphans += 1;
        console.log(`      ❌ ${lane.toUpperCase()} orphan: ${m.sourceSetupId} (${m.tradeDay} ${m.direction} E=${m.entry.toFixed(5)}) — anchorZoneId '${m.anchorZoneId}' resolves to NO model zone (exact id + LMV center-tail both miss)`);
        continue;
      }
      // The E2 projection trace: the trade's day maps to a chain day (the
      // shapeDay projection the anchor was designated from).
      const dayName = DAY_NAME_OF_ISO(m.tradeDay);
      const projected = chain?.days?.some((d) => d.day === dayName) ?? false;
      if (!projected) {
        noProjection += 1;
        console.log(`      ⚠️  ${lane.toUpperCase()} ${m.sourceSetupId} (${m.tradeDay} ${dayName}): the anchor resolves (${resolved.id}) but the day is NOT in the ${pair} E2 chain — no shapeDay projection trace`);
      } else {
        console.log(`      ${lane.toUpperCase()} ${m.sourceSetupId}: ${m.tradeDay} (${dayName}) ${m.direction} → anchor ${resolved.id} [${resolved.bottom.toFixed(5)}-${resolved.top.toFixed(5)}] + E2 projection ✓`);
      }
    }
  }
  if (orphans === 0) {
    pass(`all ${audited} ACTIVE mirrors trace to a real model zone (zero orphans — never a fabricated level)${noProjection > 0 ? ` — ${noProjection} mirror(s) lack an E2 chain-day trace (printed above)` : ' + every tradeDay traces to an E2 projection day'}`);
  } else {
    failures += 1;
    console.log(`  ❌ SV4: ${orphans} orphan anchor(s) — a trade whose anchor resolves to nothing is a fabricated level (the anti-fabrication floor)`);
  }
}

// ── SV5: THE CASCADE VALIDATION (the storyline alignment ≤0.35 + structural equivalence) ──
console.log('\nSV5 — the cascade validation (the EU/GU divergence ≤ 0.35 + the structural-equivalence matching):');
{
  let sv5ok = true;
  const euDiv = e2.euDivergence;
  const guDiv = e2.guDivergence;
  console.log(`      EU core vs DXY-inverse cascade divergence: ${euDiv === null ? 'n/a' : euDiv.toFixed(2)}`);
  console.log(`      GU core vs EU cascade divergence:          ${guDiv === null ? 'n/a' : guDiv.toFixed(2)}`);
  for (const [lane, div] of [['EU', euDiv], ['GU', guDiv]] as const) {
    if (div === null) {
      finding(`${lane} divergence is null (a chain was absent — honest absence; the pair E2 stands)`);
    } else if (div > 0.35) {
      sv5ok = false;
      console.log(`      ❌ ${lane} divergence ${div.toFixed(2)} > 0.35 — NOT VALIDATED (the storyline alignment failed)`);
    } else {
      console.log(`      ${lane} divergence ${div.toFixed(2)} ≤ 0.35 — VALIDATED`);
    }
  }
  // The structural-equivalence matching: the EU mirrors invert the DXY
  // source's element (zoneClass carried per mirror); the GU mirrors keep the
  // EU's element. Printed per mirror — the evidence, never a label.
  const setupById = new Map(dxySetups.map((s) => [s.setupId, s]));
  const euActiveBySourceId = new Map(
    cascade.eu.filter((x: MirrorOutcomeV45) => x.status === 'ACTIVE').map((x: MirrorOutcomeV45) => [x.sourceSetupId, x]),
  );
  console.log('      structural-equivalence matching (per ACTIVE mirror):');
  for (const m of cascade.eu.filter((x: MirrorOutcomeV45) => x.status === 'ACTIVE')) {
    const src = setupById.get(m.sourceSetupId);
    const srcClass = src
      ? (String(src.zoneType ?? '').startsWith('BoM') ? 'BoM'
        : String(src.zoneType ?? '').startsWith('MoM') ? 'MoM'
        : String(src.zoneType ?? '').startsWith('LSZ') ? 'LQZ'
        : (src.isBoMEntry ? 'BoM' : 'MoM'))
      : '?';
    const srcDir = src ? String(src.direction) : '?';
    const inverseOk = (srcDir === 'LONG' && m.direction === 'SHORT') || (srcDir === 'SHORT' && m.direction === 'LONG');
    const elementOk = srcClass === String(m.zoneClass);
    if (!elementOk || !inverseOk) {
      finding(`EU ${m.sourceSetupId}: DXY source ${srcDir}/${srcClass} → EU mirror ${m.direction}/${String(m.zoneClass)} — ${!inverseOk ? 'the direction is NOT inverted' : ''}${!inverseOk && !elementOk ? ' + ' : ''}${!elementOk ? 'the element class differs' : ''} (the structural-equivalence read)`);
    } else {
      console.log(`        EU ${m.sourceSetupId}: DXY ${srcDir}/${srcClass} → EU ${m.direction}/${String(m.zoneClass)} — inverse + same-element ✓`);
    }
  }
  for (const m of cascade.gu.filter((x: MirrorOutcomeV45) => x.status === 'ACTIVE')) {
    const src = euActiveBySourceId.get(m.sourceSetupId);
    const srcDir = src ? src.direction : '?';
    const srcClass = src ? String(src.zoneClass) : '?';
    const keptOk = srcDir === m.direction;
    const elementOk = srcClass === String(m.zoneClass);
    if (!keptOk || !elementOk) {
      finding(`GU ${m.sourceSetupId}: EU source ${srcDir}/${srcClass} → GU mirror ${m.direction}/${String(m.zoneClass)} — ${!keptOk ? 'the direction is NOT kept' : ''}${!keptOk && !elementOk ? ' + ' : ''}${!elementOk ? 'the element class differs' : ''} (the structural-equivalence read)`);
    } else {
      console.log(`        GU ${m.sourceSetupId}: EU ${srcDir}/${srcClass} → GU ${m.direction}/${String(m.zoneClass)} — kept + same-element ✓`);
    }
  }
  if (sv5ok) {
    pass('both lanes VALIDATED on the ≤0.35 storyline divergence + the structural-equivalence matching printed above');
  } else {
    failures += 1;
    console.log('  ❌ SV5: a lane\'s storyline divergence exceeds 0.35 — the cascade alignment failed');
  }
}

// ── SV6: DETERMINISM (build + cascade ×2 serialize identically) ──
console.log('\nSV6 — determinism (the emitted trades + the storylines, two full passes):');
{
  const serA = JSON.stringify({
    setups: passA.dxySetups,
    eu: passA.cascade.eu,
    gu: passA.cascade.gu,
    storylines: passA.e2.storylines,
  });
  const serB = JSON.stringify({
    setups: passB.dxySetups,
    eu: passB.cascade.eu,
    gu: passB.cascade.gu,
    storylines: passB.e2.storylines,
  });
  if (serA === serB) {
    pass(`two full buildE2Core + generateSourceSetupsV45 + cascadeV45 passes serialize identically (${serA.length} bytes — setups + mirrors + storylines)`);
  } else {
    fail(`the two passes diverge (${serA.length} vs ${serB.length} bytes) — non-determinism in the pipeline (§12 Law 2)`);
  }
}

console.log('');
console.log(failures === 0 ? '=== VERDICT: PASS (all gates) ===' : `=== VERDICT: FAIL (${failures} gate(s) failed) ===`);
process.exit(failures === 0 ? 0 : 1);
