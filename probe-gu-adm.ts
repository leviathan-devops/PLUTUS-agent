import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { zoneToOperative, rungToOperative } from './src/mdve/reasoning-chain.js';
import { containingStructuralZone, measureReactionWickExtreme, measureWickDispersion } from './src/mdve/anchor-decision-machine.js';

const ANCHOR_MS = 1783317600000;
lockRunAnchor(ANCHOR_MS);
const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: { timestamp: number; open: number; high: number; low: number; close: number }[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, lim: number) => (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b) => b.timestamp <= lim).sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, lim: number) => { const b = barsFor(p, '1H', lim); return b.length ? b[b.length - 1]!.close : 0; };
const model = buildChartModel('GBP/USD', WEEK, gateBars(barsFor('GBP/USD', '1H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '4H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '30m', ANCHOR_MS)), spotFor('GBP/USD', ANCHOR_MS), undefined, gateBars(barsFor('GBP/USD', '15m', ANCHOR_MS)));
const pip = 0.0001;

const rung = (model.lmv as any).table.find((r: any) => Math.abs(r.center - 1.33380) < 1e-9);
console.log('rung:', JSON.stringify({ id: rung?.id ?? '?', side: rung?.side, band: [rung?.bottom, rung?.top], defEdge: rung?.defendedEdge, reactionExtreme: rung?.reactionExtreme, candles: rung?.candles?.length, sweeps: rung?.sweepCount }));
const op = rungToOperative('GBP/USD', rung);
console.log('operative:', op.id, `[${op.floor}-${op.ceiling}]`);

const containing = containingStructuralZone(op, model.zones);
console.log('\ncontaining structural zone:', containing ? `${containing.id} [${containing.bottom}-${containing.top}] type ${containing.type} frm ${new Date(containing.formationMs!).toISOString().slice(0, 10)} reactions ${(containing.reactionEvents ?? []).length} parent ${containing.parent?.id ?? 'none'} nestedWithin ${containing.nestedWithin}` : 'NONE');

console.log('\nGU model zones in [1.330-1.337]:');
for (const z of model.zones) {
  if (z.bottom < 1.330 || z.top > 1.337) continue;
  const evs = (z.reactionEvents ?? []) as Array<{ lastTouchMs: number; price: number; anatomy?: string }>;
  console.log(`  ${z.type.padEnd(6)} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.classification} ${z.timeframe} frm ${new Date(z.formationMs!).toISOString().slice(0, 10)} reac ${evs.length}${evs.length ? ' ' + evs.map((e) => new Date(e.lastTouchMs).toISOString().slice(5, 10) + '@' + e.price.toFixed(5)).join(' ') : ''} parent ${z.parent?.id ?? '-'}`);
}

console.log('\nThe SL arithmetic (the rung ceiling 1.33343 anchor):');
for (const z of model.zones.filter((z) => z.type === 'DEMAND' && z.bottom >= 1.3334 && z.bottom < 1.336)) {
  const dOp = zoneToOperative(z);
  const m1 = measureReactionWickExtreme(dOp, 'LONG', ANCHOR_MS);
  const m2 = measureWickDispersion(dOp, 'LONG', ANCHOR_MS, pip);
  if (!m1.present) { console.log(`  ${z.id} [${z.bottom}-${z.top}]: m1 ABSENT — no SL from this demand`); continue; }
  const wickP = Math.abs(m1.value - 1.33343) / pip;
  const depth = wickP + (m2.present ? m2.value : 0.5);
  const sl = 1.33343 - depth * pip;
  const risk = (1.33343 - sl) / pip;
  const rrr = (1.33560 - 1.33343) / pip / risk;
  console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}]: m1 ${m1.value.toFixed(5)} (wick ${wickP.toFixed(1)}p from the rung ceiling) m2 ${m2.present ? m2.value.toFixed(2) + 'p' : 'absent'} → depth ${depth.toFixed(1)}p → SL ${sl.toFixed(5)} risk ${risk.toFixed(1)}p RRR ${rrr.toFixed(2)}`);
}
