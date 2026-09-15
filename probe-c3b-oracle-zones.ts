/* probe-c3b-oracle-zones.ts — 2026-08-11 — the C-3B zone-anchored diagnosis:
 * dump the E1 map's zones/rungs near the operator's oracle levels (EU + GU),
 * with their FULL MPSE state (pressure score, zfp, isBoM, reactionStatus,
 * reactionCount, floor/ceiling) — to see whether the operator's structural
 * zones exist in the map and WHY the E2's reach excludes them. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lockAnalysisPoint } from './src/mdve/temporal.js';
import { buildChartModel } from './src/mdve/index.js';
import { pressureScoreOf } from './src/mdve/lexicons/zone-pressure.js';
type LexiconData = Parameters<typeof pressureScoreOf>[0];

const ANALYSIS_POINT_MS = 1783317600000;
lockAnalysisPoint(ANALYSIS_POINT_MS);

const raw: Array<{ pair: string; timeframe: string; bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> }> =
  JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, limitMs: number) =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= limitMs);
const spotFor = (p: string, limitMs: number): number => {
  const bs = barsFor(p, '1H', limitMs);
  return bs.length > 0 ? bs[bs.length - 1]!.close : 0;
};

async function loadModel(pair: 'EUR/USD' | 'GBP/USD'): Promise<Awaited<ReturnType<typeof buildChartModel>>> {
  return buildChartModel(
    pair, '2026-07-06',
    barsFor(pair, '1H', ANALYSIS_POINT_MS),
    barsFor(pair, '4H', ANALYSIS_POINT_MS),
    barsFor(pair, '30m', ANALYSIS_POINT_MS),
    spotFor(pair, ANALYSIS_POINT_MS),
    undefined,
    barsFor(pair, '15m', ANALYSIS_POINT_MS),
  );
}

// The inline E2-side adapter (mirror of the shape-brain's zoneToLexiconPressure)
function toLex(z: { id: string; type: string; zfp?: number; reactionCount?: number; reactionStatus?: string; isBoM?: boolean; pressure?: { mitigationCount?: number; pierced?: boolean; absorption?: number } }): LexiconData {
  const isDemand = String(z.type).includes('DEMAND');
  const isBom = String(z.type).startsWith('BOM');
  return {
    zoneType: isDemand ? 'DEMAND' : 'SUPPLY',
    zoneClassification: isBom ? 'BoM' : 'MoM',
    zoneTimeframe: '1H',
    zoneZfp: z.zfp ?? 99,
    reactionCount: z.reactionCount ?? 0,
    mitigationCount: z.pressure?.mitigationCount ?? z.reactionCount ?? 0,
    reactionEvents: z.reactionCount && z.reactionCount > 0 ? Array.from({ length: z.reactionCount }, () => ({ pierced: z.pressure?.pierced ?? false })) : [],
    freshness: z.reactionStatus === 'virgin' ? 'FRESH'
      : z.reactionStatus === 'depleted' ? 'DEPLETED'
      : (z.reactionCount ?? 0) === 0 ? 'FRESH' : (z.reactionCount ?? 0) >= 3 ? 'DEPLETED' : 'TESTED_1X',
    pierced: z.pressure?.pierced ?? false,
    strongHoldCount: z.reactionCount ?? 0,
    absorption: z.pressure?.absorption,
  };
}

const TARGETS: Record<string, Array<{ label: string; level: number }>> = {
  'EUR/USD': [
    { label: 'MonS-LQZ-entry', level: 1.14395 },
    { label: 'BoM-supply-TueS', level: 1.14460 },
    { label: 'MoM-supply-WedS', level: 1.14295 },
    { label: 'WedL-demand', level: 1.14020 },
    { label: 'ThuL-fib-LQZ', level: 1.14225 },
    { label: 'FriS-chained-TP', level: 1.14555 },
    { label: 'deep-LQZ-WedL', level: 1.13935 },
  ],
  'GBP/USD': [
    { label: 'MonL', level: 1.33330 },
    { label: 'TueS', level: 1.33965 },
    { label: 'WedS', level: 1.33660 },
    { label: 'WedL', level: 1.33280 },
    { label: 'ThuS', level: 1.34260 },
    { label: 'ThuL', level: 1.33850 },
    { label: 'FriS', level: 1.34500 },
  ],
};

for (const pair of ['EUR/USD', 'GBP/USD'] as const) {
  console.log(`\n══════ ${pair} — THE OPERATOR'S ORACLE LEVELS vs THE E1 MAP ══════`);
  const model = await loadModel(pair);
  const pip = 0.0001;
  const zones = model.zones.map((z) => ({
    id: z.id, type: z.type,
    floor: z.bottom ?? 0, ceiling: z.top ?? 0,
    zfp: z.zfp ?? 99, isBoM: String(z.type).startsWith('BOM'),
    rc: z.reactionCount ?? 0, rs: z.reactionStatus,
    pressure: (z as unknown as { pressure?: { mitigationCount?: number; pierced?: boolean; absorption?: number } }).pressure,
    side: (z as unknown as { side?: string }).side,
  }));
  const rungs = ((model as unknown as { lmv?: { table: Array<{ id: string; bottom?: number; top?: number; zfp?: number; side?: string }> } }).lmv?.table ?? [])
    .map((r) => ({ id: r.id, bottom: r.bottom ?? 0, top: r.top ?? 0, zfp: r.zfp ?? 99, side: r.side ?? '' }));
  console.log(`map: ${zones.length} zones · ${rungs.length} rungs`);
  for (const t of TARGETS[pair]) {
    const nearZones = zones
      .filter((z) => z.floor <= t.level + 15 * pip && z.ceiling >= t.level - 15 * pip)
      .map((z) => ({
        id: z.id, w: ((z.ceiling - z.floor) / pip).toFixed(1) + 'p',
        zfp: z.zfp, bom: z.isBoM, rc: z.rc, rs: z.rs,
        p: pressureScoreOf(toLex(z)),
        band: `[${z.floor.toFixed(5)}-${z.ceiling.toFixed(5)}]`,
      }))
      .sort((a, b) => b.p - a.p || a.zfp - b.zfp).slice(0, 12);
    const nearRungs = rungs
      .filter((r) => r.bottom <= t.level + 10 * pip && r.top >= t.level - 10 * pip)
      .map((r) => ({
        id: r.id, w: ((r.top - r.bottom) / pip).toFixed(1) + 'p',
        zfp: r.zfp, side: r.side,
        band: `[${r.bottom.toFixed(5)}-${r.top.toFixed(5)}]`,
      }));
    console.log(`\n■ ${t.label} @ ${t.level.toFixed(5)}`);
    console.log(`  zones: ${nearZones.length ? nearZones.slice(0, 5).map((z) => `\n    ${z.id} ${z.band} w=${z.w} zfp=${z.zfp} bom=${z.bom} rc=${z.rc} rs=${z.rs} P=${z.p}`).join('') : 'NONE'}`);
    console.log(`  rungs: ${nearRungs.length ? nearRungs.slice(0, 4).map((r: any) => `\n    ${r.id} ${r.band} w=${r.w} zfp=${r.zfp} side=${r.side}`).join('') : 'NONE'}`);
  }
}
