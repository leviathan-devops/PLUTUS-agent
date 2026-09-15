/**
 * PROBE-ADM — the W-ADM-1b six-golden-lane probe through anchorTrade.
 * TEMP — deleted after the run (the plan: "no files left in the repo beyond
 * the module edits").
 */
import { buildChartModel } from './src/mdve/index.js';
import { lockAnalysisPoint } from './src/mdve/temporal.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { anchorTrade, type AdmInput, type AdmResult } from './src/mdve/anchor-decision-machine.js';
import { resolveOperativeZone } from './src/mdve/reasoning-chain.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';
import type { ChartModel } from './src/mdve/types.js';

const ANCHOR_MS = 1783317600000;
lockAnalysisPoint(ANCHOR_MS);
const WEEK = '2026-07-06';

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, limitMs: number): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b) => b.timestamp <= limitMs).sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number): number => {
  const b = barsFor(p, '1H', limitMs);
  return b.length ? b[b.length - 1]!.close : 0;
};

const models: Record<string, ChartModel | null> = {
  DXY: await buildChartModel('DXY', WEEK, barsFor('DXY', '1H', ANCHOR_MS), barsFor('DXY', '4H', ANCHOR_MS), barsFor('DXY', '30m', ANCHOR_MS), spotFor('DXY', ANCHOR_MS), undefined, barsFor('DXY', '15m', ANCHOR_MS)),
  'EUR/USD': await buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H', ANCHOR_MS), barsFor('EUR/USD', '4H', ANCHOR_MS), barsFor('EUR/USD', '30m', ANCHOR_MS), spotFor('EUR/USD', ANCHOR_MS), undefined, barsFor('EUR/USD', '15m', ANCHOR_MS)),
  'GBP/USD': await buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H', ANCHOR_MS), barsFor('GBP/USD', '4H', ANCHOR_MS), barsFor('GBP/USD', '30m', ANCHOR_MS), spotFor('GBP/USD', ANCHOR_MS), undefined, barsFor('GBP/USD', '15m', ANCHOR_MS)),
};

const pip: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

function runLane(name: string, pair: string, direction: 'LONG' | 'SHORT', zoneId: string, priorTp?: number): AdmResult {
  const m = models[pair];
  if (!m) throw new Error(`${name}: model null`);
  const operative = resolveOperativeZone(m, pair, zoneId);
  if (!operative) throw new Error(`${name}: zone ${zoneId} unresolved`);
  const input: AdmInput = {
    model: m.zones,
    lmvTable: (m.lmv as unknown as { table: unknown[] }).table as never,
    pair,
    pip: pip[pair]!,
    operativeZone: operative,
    direction,
    dayOpenSpot: spotFor(pair, ANCHOR_MS),
    priorTp,
    e1ZoneId: zoneId,
    e2ProjectionId: zoneId,
    atr1hPips: proxyAtr1hPips(m, pip[pair]!),
  };
  const res = anchorTrade(input);
  console.log(`[${name}] ${direction} zone ${zoneId} band [${operative.floor.toFixed(5)}-${operative.ceiling.toFixed(5)}]`);
  console.log(`  → verdict ${res.verdict}${res.rejectReason ? ` (${res.rejectReason})` : ''} | E ${res.entry.toFixed(5)} | SL ${res.sl.toFixed(5)} | TP ${res.tp.toFixed(5)} | RRR ${res.rrr.toFixed(2)}`);
  if (res.rejectEvidence) for (const e of res.rejectEvidence) console.log(`    ! ${e}`);
  return res;
}

console.log('══════════ THE ADM SIX-LANE PROBE (golden week 2026-07-06) ══════════');
runLane('EU SHORT', 'EUR/USD', 'SHORT', 'EUR/USD|1H|1783076400000|1.14460');
runLane('DXY SHORT', 'DXY', 'SHORT', 'DXY|1H|1782990000000|101.027');
runLane('DXY LONG', 'DXY', 'LONG', 'DXY|1H|1781841600000|100.945', 100.918);
runLane('GU LONG', 'GBP/USD', 'LONG', 'LMV|GBP/USD|1.33380');
runLane('GU SHORT', 'GBP/USD', 'SHORT', 'GBP/USD|1H|1783062000000|1.33623');
