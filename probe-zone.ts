// PROBE-ZONE — the [1.14307, 1.14494] zone's full identity: which engine, what fields.
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const raw: any = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string) => (raw.find((r: any) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b: any) => b.timestamp <= ANCHOR_MS).sort((a: any, b: any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };
const model = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m'));
console.log('=== the [1.14307, 1.14494] zone candidates in the pool ===');
for (const z of model.zones) {
  if (Math.abs((z as any).bottom - 1.14307) < 1e-4 || Math.abs((z as any).floor - 1.14307) < 1e-4) {
    console.log(`  id=${z.id} type=${z.type} tf=${z.timeframe} band=[${(z as any).bottom ?? (z as any).floor}, ${(z as any).top ?? (z as any).ceiling}] class=${(z as any).classification} freshness=${(z as any).freshness} zfp=${(z as any).zfp} confluence=${(z as any).confluence} refined=${(z as any).refinedLabel ?? '-'} nestedWithin=${(z as any).nestedWithin ?? '-'} events=${(z as any).reactionEvents?.length ?? 0}`);
  }
}
console.log('=== all the non-LMV zones between 1.1420 and 1.1455 (what the pool holds there) ===');
for (const z of model.zones) {
  const lo = (z as any).bottom ?? (z as any).floor ?? 0;
  const hi = (z as any).top ?? (z as any).ceiling ?? 0;
  if (String(z.id).startsWith('LMV|')) continue;
  if (hi >= 1.1420 && lo <= 1.1455) {
    console.log(`  id=${z.id} type=${z.type} tf=${z.timeframe} band=[${lo.toFixed(5)}, ${hi.toFixed(5)}] class=${(z as any).classification} freshness=${(z as any).freshness} zfp=${(z as any).zfp} events=${(z as any).reactionEvents?.length ?? 0} refined=${(z as any).refinedLabel ?? '-'}`);
  }
}
console.log(`\nzones total: ${model.zones.length}`);
