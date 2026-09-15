import { buildChartModel } from './src/mdve/index.js';
import { lockAnalysisPoint } from './src/mdve/temporal.js';
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
  'EUR/USD': await buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H', ANCHOR_MS), barsFor('EUR/USD', '4H', ANCHOR_MS), barsFor('EUR/USD', '30m', ANCHOR_MS), spotFor('EUR/USD', ANCHOR_MS), undefined, barsFor('EUR/USD', '15m', ANCHOR_MS)),
};

console.log('=== EU SHORT operative zone [1.1446-1.14571] full reaction events ===');
const op = resolveOperativeZone(models['EUR/USD']!, 'EUR/USD', 'EUR/USD|1H|1783076400000|1.14460')!;
console.log('operative zone:', JSON.stringify({ id: op.id, floor: op.floor, ceiling: op.ceiling, reactionCount: op.reactionCount }, null, 1));
const src = op.sourceZone as { reactionEvents?: Array<{ firstTouchMs: number; lastTouchMs: number; price: number; anatomy: string; pierced: boolean }> } | undefined;
console.log('sourceZone reactionEvents:', JSON.stringify(src?.reactionEvents ?? [], null, 1));
console.log('RECENCY_WINDOW_MS = 3 days from anchor:', new Date(ANCHOR_MS).toISOString(), 'window start', new Date(ANCHOR_MS - 3 * 86400000).toISOString());
