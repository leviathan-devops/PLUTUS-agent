// Plutus V5 W2 — src/e1/run-fixture.ts
// SC-3 artifact: the REAL E1 pipeline — MarketDataAdapter -> OBCVEngine ->
// lexicon machines -> zoneMapActor -> Journal — over deterministic bars,
// journaling one ZoneMapSnapshot (+ LexiconVerdicts) per pair.
//
// REAL stages, no doubles (W2 rewrite-to-spec):
//   decodeMarketData (src/e1/adapters/market-data-adapter.ts) — bar.t >
//     anchorMs throws TYPED FutureBarLeak (_tag FUTURE_BAR_LEAK, the SC-5 gate)
//   OBCVEngine.detect (src/e1/adapters/obcv-engine.ts) — bw >= 3.0,
//     bf >= 0.65, the 4H-BoM / 30m-MoM-only tf law
//   DEFAULT_MACHINES classify (src/e1/machines/*) — the 6 lexicon verdicts
//   zoneMapActor (src/e1/actors/zone-map-actor.ts) — ZONE_ADDED /
//     PRESSURE_CHANGED / VERDICT_RECORDED / FINALIZE -> ZoneMapSnapshot
//   Journal.append (src/jesl) — one verdict row per pair, hash-chained
//
// Bars: deterministic synthetic mulberry32(SYNTH_SEED) background + sculpted
// OBCV-accept windows (5 strong-body bars bw=5.0/bf~=0.71 + a directional
// breakout close) per pair side. bars_raw.json is ABSENT at build time —
// substitution recorded honestly in artifact meta.barsSource. No oracle reads
// anywhere (D17: oracle rows are measurement targets only, never inputs).
// R2: E1 builds the ZoneMapSnapshot E2 consumes. R3: the snapshot is read-only
// evidence downstream — this file never emits prices on designation types.
// D13: doctrine quoted in comments, never synthesized.
//
// run: bun src/e1/run-fixture.ts [--out=<path>]
//   default out: /tmp/e1-snapshot.json (NOT specs/ — W0 specs are read-only).
import { writeFileSync } from 'node:fs';
import { DEFAULT_MACHINES } from './machines/index';
import { decodeMarketData } from './adapters/market-data-adapter.ts';
import { OBCVEngine } from './adapters/obcv-engine.ts';
import { createZoneMapActor, readZoneMapSnapshot, type ZoneMapSnapshot } from './actors/zone-map-actor.ts';
import { Journal, runIdFor, sha256Hash, canonicalSerialize } from '../jesl/index';
import type { LexiconData, LexiconVerdict, OHLCBar, PairKey, ZoneModel } from './core/types';
import { SYNTH_SEED, makeLexiconData, synthBars } from './tests/helpers';

const ANCHOR = 1783317600000; // spec D.4 ANALYSIS_POINT_MS
const PAIR_CFG: Record<string, { pair: PairKey; pip: number; atr14: number; center: number; bgVol: number; tf: '1H' }> = {
  'EUR/USD': { pair: 'EUR/USD', pip: 0.0001, atr14: 0.0006, center: 1.1425, bgVol: 0.00018, tf: '1H' },
  'GBP/USD': { pair: 'GBP/USD', pip: 0.0001, atr14: 0.0008, center: 1.338, bgVol: 0.00022, tf: '1H' },
  'DXY': { pair: 'DXY', pip: 0.01, atr14: 0.08, center: 101.0, bgVol: 0.018, tf: '1H' },
};

const N_BARS = 120;
const HOUR = 3600_000;

// Sculpt one OBCV-accept structure: 5 strong-body consolidation bars
// (body 5 pips, range 7 pips → bw 5.0 >= 3.0, bf ~= 0.71 >= 0.65) + the
// directional breakout bar closing beyond the window extreme.
// Pure arithmetic from cfg — no oracle reads.
function sculptOBCV(bars: OHLCBar[], at: number, side: 'DEMAND' | 'SUPPLY', pip: number, base: number): void {
  const dir = side === 'DEMAND' ? 1 : -1;
  if (at < 0 || at + 5 >= bars.length) {
    throw new Error(`[run-fixture] sculpt index ${at} out of range (len ${bars.length})`);
  }
  let o = base;
  for (let k = 0; k < 5; k++) {
    const t = bars[at + k]!.t;
    const c = o + dir * 5 * pip;
    bars[at + k] = { t, O: o, H: Math.max(o, c) + pip, L: Math.min(o, c) - pip, C: c };
    o = c;
  }
  const window = bars.slice(at, at + 5);
  const hi = Math.max(...window.map((b) => b.H));
  const lo = Math.min(...window.map((b) => b.L));
  const t = bars[at + 5]!.t;
  bars[at + 5] = side === 'DEMAND'
    ? { t, O: hi - pip, H: hi + 6 * pip, L: hi - 2 * pip, C: hi + 5 * pip }
    : { t, O: lo + pip, H: lo + 2 * pip, L: lo - 6 * pip, C: lo - 5 * pip };
}

function buildBars(cfg: (typeof PAIR_CFG)[string], seed: number): OHLCBar[] {
  const bars = synthBars(seed, N_BARS, ANCHOR - N_BARS * HOUR, HOUR, cfg.center, 0, cfg.bgVol);
  sculptOBCV(bars, 10, 'DEMAND', cfg.pip, cfg.center - 0.001);
  sculptOBCV(bars, 60, 'SUPPLY', cfg.pip, cfg.center + 0.001);
  const gated = bars.filter((b) => b.t <= ANCHOR);
  if (gated.length === 0) throw new Error('[run-fixture] synth produced zero bars — seed/pipeline failure, refusing empty snapshot');
  return gated;
}

async function main(): Promise<void> {
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outPath = outArg ? outArg.slice('--out='.length) : '/tmp/e1-snapshot.json';
  const journal = new Journal();
  const run = runIdFor(sha256Hash(canonicalSerialize({ anchor: ANCHOR, seed: SYNTH_SEED })), 'e1-golden-week');
  const obcv = new OBCVEngine();

  const snapshots: Record<string, unknown> = {};
  let totalVerdicts = 0;
  let totalZones = 0;
  let zonesWithoutVerdicts = 0;
  for (const key of Object.keys(PAIR_CFG)) {
    const cfg = PAIR_CFG[key]!;
    // STAGE 1 — the temporal gate: bar.t > anchorMs throws TYPED FutureBarLeak (SC-5). Fail LOUD, never filter.
    let bars: OHLCBar[];
    try {
      bars = decodeMarketData(buildBars(cfg, SYNTH_SEED + key.length), ANCHOR);
    } catch (e) {
      console.error(`[run-fixture] LOUD FAIL adapter ${key}: ${(e as Error).message}`);
      process.exit(1);
    }
    // STAGE 2 — live OBCV vision (bw/bf gates + tf law), computed from the gated bars.
    const zones: ZoneModel[] = obcv.detect({ bars, pair: cfg.pair, tf: cfg.tf, pip: cfg.pip, atr14: cfg.atr14 });
    const data: LexiconData = makeLexiconData({
      bars, zones,
      meta: { pair: cfg.pair, week: '2026-07-06', anchorMs: ANCHOR, spot: bars[bars.length - 1]!.C, atr14: cfg.atr14, pip: cfg.pip, tf: cfg.tf },
    });
    // STAGE 3 — the six lexicon machines over the live data (predicates read LMV/OBCV outputs, never fixtures).
    const verdicts: LexiconVerdict[] = DEFAULT_MACHINES.map((m) => {
      let r;
      try {
        r = m.classify({ data });
      } catch (e) {
        console.error(`[run-fixture] LOUD FAIL machine ${m.id} ${key}: ${(e as Error).message}`);
        process.exit(1);
      }
      return {
        pattern: `${m.id}:${r.intent}`,
        state: r.action === 'classify' ? 'CLASSIFIED' : 'REJECTED',
        evidence: { file: `src/e1/machines/${m.id}.ts`, line: 1, quote: r.evidence },
      };
    });
    // STAGE 4 — the running zone map: zones + pressures + verdicts -> FINALIZE -> ZoneMapSnapshot (SC-3/SC-4).
    const actor = createZoneMapActor();
    actor.start();
    let snapshot: ZoneMapSnapshot = { zones: [], rungs: [], verdicts: [] };
    try {
      for (const z of zones) {
        actor.send({ type: 'ZONE_ADDED', zone: z });
        if (z.pressure !== undefined) actor.send({ type: 'PRESSURE_CHANGED', zoneId: z.id, pressure: z.pressure });
      }
      for (const v of verdicts) actor.send({ type: 'VERDICT_RECORDED', verdict: v });
      snapshot = readZoneMapSnapshot(actor);
      actor.send({ type: 'FINALIZE' });
      const done = actor.getSnapshot();
      if (done.status === 'done') snapshot = done.output as ZoneMapSnapshot;
    } finally {
      actor.stop();
    }
    totalVerdicts += verdicts.length;
    totalZones += zones.length;
    if (zones.length > 0 && verdicts.length === 0) zonesWithoutVerdicts += zones.length;
    snapshots[key] = {
      pair: key, bars: bars.length, zones: zones.map((z) => z.id),
      zoneDetail: zones, verdicts, snapshotZones: snapshot.zones.length, snapshotVerdicts: snapshot.verdicts.length,
    };
    // STAGE 5 — journal the snapshot (Triplet evidence; hash-chained per run).
    journal.append({
      run, node: `e1-pipeline:${key}`, kind: 'verdict',
      verdict: zones.length > 0 ? 'PASS' : 'INCONCLUSIVE',
      evidence: { pattern: `e1-pipeline:${key}`, state: `${zones.length} zones, ${verdicts.length} verdicts`, anchor: `anchorMs=${ANCHOR}` },
      source: 'src/e1/run-fixture.ts',
    });
  }

  const chainValid = journal.verifyChain(run);
  const artifact = {
    meta: {
      week: '2026-07-06', analysisPointMs: ANCHOR, run,
      barsSource: `synthetic mulberry32 seed=${SYNTH_SEED} + sculpted OBCV-accept windows (bars_raw.json absent — substitution recorded)`,
      pipeline: ['decodeMarketData (MarketDataAdapter, FUTURE_BAR_LEAK gate)', 'OBCVEngine.detect (bw>=3.0 bf>=0.65 tf-law)', 'DEFAULT_MACHINES classify x6', 'zoneMapActor ZONE_ADDED/VERDICT_RECORDED/FINALIZE', 'Journal.append + verifyChain'],
      journalChainValid: chainValid,
      zonesWithoutVerdicts,
    },
    snapshots,
    journalRows: journal.query(run),
    totals: { pairs: Object.keys(snapshots).length, zones: totalZones, verdicts: totalVerdicts, zonesWithoutVerdicts },
  };
  try {
    writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  } catch (e) {
    console.error(`[run-fixture] LOUD FAIL snapshot write ${outPath}: ${(e as Error).message}`);
    process.exit(1);
  }
  console.log(`[run-fixture] pairs=${artifact.totals.pairs} zones=${totalZones} verdicts=${totalVerdicts} zonesWithoutVerdicts=${zonesWithoutVerdicts} chainValid=${chainValid} out=${outPath}`);
}

main().catch((e) => { console.error(`[run-fixture] LOUD FAIL: ${(e as Error).message}`); process.exit(1); });
