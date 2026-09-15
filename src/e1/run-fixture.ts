// Plutus V5 W2 — src/e1/run-fixture.ts
// The SC-3 artifact: runs the E1 pipeline (adapter -> OBCV -> machines ->
// journal) over bars data and journals a ZoneMapSnapshot + LexiconVerdicts.
// Bars source: /tmp/opencode/bars_raw.json is PRESENT (1H feeds for
// DXY/EUR-USD/GBP-USD) — decoded via decodeMarketData with the ANCHOR
// temporal gate (future bars throw, never filter). Deterministic synthetic
// bars from mulberry32 (SYNTH_SEED, recorded in the artifact) are FALLBACK
// ONLY when the file or a 1H feed is missing.
// Substitution recorded honestly in the snapshot's `barsSource` field.
// SEAMS: the shipped src/e1/adapters/* (decodeMarketData + OBCVEngine) —
// landed, no doubles. 30m/15m feeds are GAP (empty on disk); never aggregate
// 1H→4H or 1H→30m (forged closes).
// Journal: the runtime src/jesl Journal (importable — used directly).
// run: bun src/e1/run-fixture.ts [--out specs/e1-snapshot.json]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_MACHINES } from './machines/index';
import { Journal, runIdFor, sha256Hash, canonicalSerialize } from '../jesl/index';
import type { LexiconData, OHLCBar, PairKey, ZoneModel } from './core/types';
import { decodeMarketData } from './adapters/market-data-adapter.ts';
import { OBCVEngine } from './adapters/obcv-engine.ts';
import {
  SYNTH_SEED, makeLexiconData, synthBars,
} from './tests/helpers';

const BARS_RAW = join('/tmp', 'opencode', 'bars_raw.json');
const obcv = new OBCVEngine();

function loadRealBars(pair: PairKey, tf: '1H' | '4H'): OHLCBar[] | null {
  if (!existsSync(BARS_RAW)) return null;
  const raw = JSON.parse(readFileSync(BARS_RAW, 'utf8')) as Array<{
    pair: string; timeframe: string;
    bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number }>;
  }>;
  const feed = raw.find((f) => f.pair === pair && f.timeframe === tf);
  if (!feed || feed.bars.length === 0) return null;
  return decodeMarketData(feed.bars, ANCHOR);
}

const ANCHOR = 1783317600000; // spec D.4 ANALYSIS_POINT_MS
const PAIR_CFG: Record<string, { pair: PairKey; pip: number; atr14: number; center: number; vol: number; tf: '1H' }> = {
  'EUR/USD': { pair: 'EUR/USD', pip: 0.0001, atr14: 0.0006, center: 1.1425, vol: 0.0009, tf: '1H' },
  'GBP/USD': { pair: 'GBP/USD', pip: 0.0001, atr14: 0.0008, center: 1.338, vol: 0.0011, tf: '1H' },
  'DXY': { pair: 'DXY', pip: 0.01, atr14: 0.08, center: 101.0, vol: 0.09, tf: '1H' },
};

function buildBars(cfg: (typeof PAIR_CFG)[string], seed: number): OHLCBar[] {
  const bars = synthBars(seed, 120, ANCHOR - 120 * 3600_000, 3600_000, cfg.center - 0.0015, 0.00002, cfg.vol)
    .filter((b) => b.t <= ANCHOR);
  if (bars.length === 0) throw new Error('[run-fixture] synth produced zero bars — seed/pipeline failure, refusing empty snapshot');
  sculptStructures(bars, cfg);
  return bars;
}

// Deterministic sculpt: overwrite 4 triplets with pivot+displacement geometry
// the OBCV gates accept (bw>=3.0, bf>=0.65, pivot low/high + directional
// close). Alternates DEMAND/SUPPLY around the pair center so the snapshot
// exercises both zone sides. Pure arithmetic from cfg — no oracle reads.
function sculptStructures(bars: OHLCBar[], cfg: (typeof PAIR_CFG)[string]): void {
  const v = cfg.vol;
  const spots: Array<{ at: number; side: 'DEMAND' | 'SUPPLY'; p: number }> = [
    { at: 10, side: 'DEMAND', p: cfg.center - 4 * v },
    { at: 40, side: 'SUPPLY', p: cfg.center + 4 * v },
    { at: 70, side: 'DEMAND', p: cfg.center - 2 * v },
    { at: 100, side: 'SUPPLY', p: cfg.center + 6 * v },
  ];
  for (const s of spots) {
    if (s.at - 1 < 0 || s.at + 1 >= bars.length) {
      throw new Error(`[run-fixture] sculpt index ${s.at} out of range (len ${bars.length})`);
    }
    const t0 = bars[s.at - 1]!.t;
    const t1 = bars[s.at]!.t;
    const t2 = bars[s.at + 1]!.t;
    if (s.side === 'DEMAND') {
      bars[s.at - 1] = { t: t0, O: s.p + 2 * v, H: s.p + 3 * v, L: s.p, C: s.p + v };
      bars[s.at] = { t: t1, O: s.p + v, H: s.p + 8 * v, L: s.p - v, C: s.p + 7 * v };
      bars[s.at + 1] = { t: t2, O: s.p + 7 * v, H: s.p + 9 * v, L: s.p + 2 * v, C: s.p + 8 * v };
    } else {
      bars[s.at - 1] = { t: t0, O: s.p - 2 * v, H: s.p, L: s.p - 3 * v, C: s.p - v };
      bars[s.at] = { t: t1, O: s.p - v, H: s.p + v, L: s.p - 8 * v, C: s.p - 7 * v };
      bars[s.at + 1] = { t: t2, O: s.p - 7 * v, H: s.p - 2 * v, L: s.p - 9 * v, C: s.p - 8 * v };
    }
  }
}

async function main(): Promise<void> {
  const eqArg = process.argv.find((a) => a.startsWith('--out='));
  const spIdx = process.argv.findIndex((a) => a === '--out');
  const outPath = eqArg
    ? eqArg.slice('--out='.length)
    : spIdx >= 0 && process.argv[spIdx + 1]
      ? process.argv[spIdx + 1]!
      : join(process.cwd(), 'specs', 'e1-snapshot.json');
  const journal = new Journal();
  const run = runIdFor(sha256Hash(canonicalSerialize({ anchor: ANCHOR, seed: SYNTH_SEED })), 'e1-golden-week');

  const snapshots: Record<string, unknown> = {};
  let totalVerdicts = 0;
  for (const key of Object.keys(PAIR_CFG)) {
    const cfg = PAIR_CFG[key]!;
    let bars: OHLCBar[];
    let barsSource: 'bars_raw' | 'synthetic';
    try {
      const real = loadRealBars(cfg.pair, cfg.tf);
      if (real && real.length > 0) {
        bars = real;
        barsSource = 'bars_raw';
      } else {
        bars = decodeMarketData(buildBars(cfg, SYNTH_SEED + key.length), ANCHOR);
        barsSource = 'synthetic';
      }
    } catch (e) {
      console.error(`[run-fixture] LOUD FAIL adapter ${key}: ${(e as Error).message}`);
      process.exit(1);
    }
    const zones: ZoneModel[] = obcv.detect({ pair: cfg.pair, tf: cfg.tf, pip: cfg.pip, bars, atr14: cfg.atr14 });
    const data: LexiconData = makeLexiconData({
      bars, zones,
      meta: { pair: cfg.pair, anchorMs: ANCHOR, spot: bars[bars.length - 1]!.C, atr14: cfg.atr14, pip: cfg.pip, tf: cfg.tf },
    });
    const verdicts = DEFAULT_MACHINES.map((m) => {
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
        evidence: { file: `src/e1/machines/${m.id}.ts`, machine: m.id, confidence: r.confidence, detail: r.evidence },
      };
    });
    totalVerdicts += verdicts.length;
    snapshots[key] = {
      pair: key, bars: bars.length, barsSource, zones: zones.map((z) => z.id),
      zoneDetail: zones, verdicts,
    };
    journal.append({
      run, node: `e1-pipeline:${key}`, kind: 'verdict',
      verdict: zones.length > 0 ? 'PASS' : 'INCONCLUSIVE',
      evidence: { pattern: `e1-pipeline:${key}`, state: `${zones.length} zones, ${verdicts.length} verdicts`, anchor: `anchorMs=${ANCHOR}` },
      source: 'src/e1/run-fixture.ts',
    });
  }

  const artifact = {
    meta: {
      week: '2026-07-06', analysisPointMs: ANCHOR, run,
      barsSource: existsSync(BARS_RAW)
        ? `decodeMarketData(bars_raw 1H t<=${ANCHOR})`
        : `synthetic mulberry32 seed=${SYNTH_SEED} (bars_raw.json absent — substitution recorded)`,
      seams: ['SEAM-ADAPTER: src/e1/adapters/decodeMarketData', 'SEAM-OBCV: src/e1/adapters/OBCVEngine', 'SEAM-ACTORS: zoneMapActor/pressureActor — verdicts journaled directly'],
      journalChainValid: journal.verifyChain(run),
    },
    snapshots,
    journalRows: journal.query(run),
    totals: { pairs: Object.keys(snapshots).length, verdicts: totalVerdicts },
  };
  try {
    writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  } catch (e) {
    console.error(`[run-fixture] LOUD FAIL snapshot write ${outPath}: ${(e as Error).message}`);
    process.exit(1);
  }
  console.log(`[run-fixture] pairs=${artifact.totals.pairs} verdicts=${artifact.totals.verdicts} chainValid=${artifact.meta.journalChainValid} out=${outPath}`);
}

main().catch((e) => { console.error(`[run-fixture] LOUD FAIL: ${(e as Error).message}`); process.exit(1); });
