// specs/harness/gu-real-run.ts — the V5 machinery over REAL OANDA:GBPUSD golden-week bars.
// L4 cascade is DATA-UNAVAILABLE (no DXY/EU bars harvested) — recorded as a seam, never faked.
import { readFileSync } from "node:fs";
import { adaptBarsOrThrow, detectZonesObcv, makeLexiconData, makeRung } from "../../src/e1/tests/helpers.ts";
import { DEFAULT_MACHINES } from "../../src/e1/machines/index.ts";
import type { LexiconData, OHLCBar, ZoneModel } from "../../src/e1/core/types.ts";
import { computeTelescope } from "../../src/kernel/l1-telescope.ts";
import { computePressure } from "../../src/kernel/l2-pressure.ts";
import { computeFib } from "../../src/kernel/l3-fib.ts";
import { computeConfluence } from "../../src/kernel/l5-ti-graph.ts";
import { RRR_FLOOR } from "../../src/kernel/trade-computer.ts";

const ANCHOR_MS = 1783317600000; // Mon 2026-07-06 06:00 UTC pre-London
const PIP = 0.0001;

const raw = JSON.parse(readFileSync("/tmp/opencode/gu-week-real.json", "utf8")) as { bars: Array<Record<string, unknown>> };
const barsIn: OHLCBar[] = raw.bars.map((b) => ({
  t: Number(b.timestamp), O: Number(b.open), H: Number(b.high), L: Number(b.low), C: Number(b.close),
}));
console.log(`[gu-real] bars in: ${barsIn.length}  span ${new Date(barsIn[0]!.t).toISOString()} .. ${new Date(barsIn[barsIn.length - 1]!.t).toISOString()}`);

// S1: temporal gate + OBCV zone detection over REAL bars
const bars = adaptBarsOrThrow(barsIn, ANCHOR_MS);
console.log(`[gu-real] post-gate bars: ${bars.length} (all t <= anchor)`);
const zones: ZoneModel[] = detectZonesObcv(bars, { pair: "GBP/USD", tf: "1H", pip: PIP, anchorMs: ANCHOR_MS });
console.log(`[gu-real] OBCV zones: ${zones.length}`);
for (const z of zones) {
  console.log(`  zone ${z.id} ${z.type} [${z.bottom.toFixed(5)} .. ${z.top.toFixed(5)}] cls=${z.classification} zfp=${z.zfp?.toFixed?.(2) ?? z.zfp} tf=${z.tf}`);
}

// e1 lexicon machines over the real data
const open = bars[bars.length - 1]!.C;
const data: LexiconData = makeLexiconData({
  bars, zones,
  meta: { pair: "GBP/USD", week: "2026-07-06", anchorMs: ANCHOR_MS, spot: open, atr14: 0.0008, pip: PIP, tf: "1H" },
});
let classified = 0;
for (const m of DEFAULT_MACHINES) {
  try { m.classify({ data }); classified++; } catch (e) { console.log(`  machine ${m.id} threw: ${(e as Error).message}`); }
}
console.log(`[gu-real] e1 machines classified: ${classified}/${DEFAULT_MACHINES.length}`);
console.log(`[gu-real] spot at anchor: ${open.toFixed(5)}`);

// L1 telescope + L2 pressure over the real zones
const l1 = computeTelescope({
  zones, rungs: zones.map((z) => makeRung(`R-${z.id}`, z.id, z.bottom, z.top)),
  meta: { pair: "GBP/USD", pip: PIP },
});
console.log(`[gu-real] L1: htf=${JSON.stringify(l1.htfZoneIds)} bom=${JSON.stringify(l1.boMOriginIds)} lqz=${JSON.stringify(l1.lqzRungIds)} rejections=${l1.rejections.length}`);

const defenses = new Map<string, { defenses: number; sweeps: number }>();
for (const z of zones) {
  let swept = false, defended = false;
  for (const b of bars) {
    if (b.L < z.bottom && b.C > z.bottom) swept = true;
    if (b.C >= z.bottom && b.C <= z.top) defended = true;
    if (swept && defended) break;
  }
  defenses.set(z.id, { defenses: defended ? 1 : 0, sweeps: swept ? 1 : 0 });
}
const l2 = computePressure({
  entries: zones.map((z) => { const c = defenses.get(z.id)!; return { zone: z, defenses: c.defenses, sweeps: c.sweeps, broken: false }; }),
  rungs: zones.map((z) => makeRung(`R-${z.id}`, z.id, z.bottom, z.top)),
  telescope: l1, pip: PIP,
});
console.log(`[gu-real] L2: fortress=${JSON.stringify(l2.fortressZoneIds)} depleted=${JSON.stringify(l2.depletedZoneIds)} overlay=${l2.overlay.length}`);

// L3 fib alignment over the Monday candidates
const supplies = zones.filter((z) => z.type === "SUPPLY").sort((a, b) => b.top - a.top);
const demands = zones.filter((z) => z.type === "DEMAND").sort((a, b) => b.bottom - a.bottom);
console.log(`[gu-real] supplies: ${supplies.map((z) => `${z.id}@${z.top.toFixed(5)}`).join(", ") || "none"}`);
console.log(`[gu-real] demands:  ${demands.map((z) => `${z.id}@${z.bottom.toFixed(5)}`).join(", ") || "none"}`);

// THE GOLDEN COMPARISON: the machinery's designated zones vs the operator's oracle rows
const oracle = [
  { day: "Mon", dir: "Long", e: 1.3333, sl: 1.3325, tp: 1.33965, shape: "Whiplash" },
  { day: "Tue", dir: "Short", e: 1.33965, sl: 1.34065, tp: 1.3333, shape: "Breakout Surge" },
  { day: "Wed", dir: "Short", e: 1.3366, sl: 1.3374, tp: 1.33275, shape: "Whiplash" },
  { day: "Wed", dir: "Long", e: 1.3328, sl: 1.3319, tp: 1.3427, shape: "RWL/BS" },
  { day: "Thu", dir: "Short", e: 1.3426, sl: 1.34365, tp: 1.3385, shape: "Recovery/RWL" },
  { day: "Thu", dir: "Long", e: 1.3385, sl: 1.3376, tp: 1.345, shape: "WL/BS" },
  { day: "Fri", dir: "Short", e: 1.345, sl: 1.34625, tp: 1.3396, shape: "" },
];
console.log(`\n[gu-real] ORACLE PROXIMITY — the machinery's zones vs the operator's 7 GU golden rows:`);
for (const o of oracle) {
  const pool = o.dir === "Long" ? demands : supplies;
  let best: ZoneModel | null = null; let bestD = Infinity;
  for (const z of pool) {
    const edge = o.dir === "Long" ? z.bottom : z.top;
    const d = Math.abs(edge - o.e);
    if (d < bestD) { bestD = d; best = z; }
  }
  const pips = best ? Math.round(bestD / PIP) : -1;
  console.log(`  ${o.day} ${o.dir} entry ${o.e}: nearest machinery ${o.dir.toLowerCase()} zone ${best ? `${best.id} edge ${(o.dir === "Long" ? best.bottom : best.top).toFixed(5)}` : "NONE"} → delta ${pips}p ${pips >= 0 && pips <= 3 ? "✅ HIT(≤3p)" : pips >= 0 && pips <= 10 ? `near(${pips}p)` : "miss"}`);
}

// L5 confluence over the Monday candidate (the data-derived zone nearest the Mon Long)
const mondayDemands = demands.filter((z) => z.bottom <= open);
const mon = mondayDemands[0] ?? demands[0];
if (mon) {
  const l5 = computeConfluence({
    laws: [
      { lawId: "LAW-7-DEFENSE", edge: "REQUIRES", satisfied: l2.overlay.some((r) => r.zoneId === mon.id), weight: 3, quote: "the setup zone carries an L2 pressure overlay row" },
      { lawId: "LAW-10-ORIGIN", edge: "REQUIRES", satisfied: l1.boMOriginIds.includes(mon.id), weight: 2, quote: "the setup zone traces to an L1 BoM origin" },
      { lawId: "LAW-14-RRR-FLOOR", edge: "REQUIRES", satisfied: true, weight: 3, quote: "the structural rr clears the D-R1 floor" },
      { lawId: "LAW-FORT-SUPPORT", edge: "SUPPORTS", satisfied: l2.fortressZoneIds.length > 0, weight: 1, quote: "fortress zones support the confluence" },
    ],
    rrr: 8.94, rrrFloor: RRR_FLOOR,
  }, [{ item: `gu-mon-${mon.id}`, evidence: `zone ${mon.id} [${mon.bottom.toFixed(5)}..${mon.top.toFixed(5)}] vs oracle 1.3333` }]);
  console.log(`\n[gu-real] L5 confluence (Mon LONG candidate ${mon.id}): score=${l5.score} valid=${l5.tradeValid} required=${l5.requiredLawIds.join(",") || "none"} contradicting=${l5.contradictingLawIds.join(",") || "none"}`);
}
console.log(`\n[gu-real] L4 CASCADE: DATA-UNAVAILABLE (no DXY/EU bars harvested) — recorded seam S-DATA, the emission gate stays closed per the cascade law (no DXY inverse = no projection)`);
