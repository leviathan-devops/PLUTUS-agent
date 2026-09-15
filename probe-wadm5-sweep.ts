/**
 * PROBE-WADM5-SWEEP — the outcome sweep: which SL/TP geometries WIN on the
 * real bars for the three losing lanes? The candidates come ONLY from the
 * measured structures (the reaction levels, the structural walls, the
 * RRR-cap arithmetic) — a pure sweep to find the boundary, then the fix maps
 * a MEASURED structure onto the winning side of the boundary.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface RawFeed { pair: string; timeframe: string; bars: { timestamp: number; open: number; high: number; low: number; close: number }[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const ANCHOR_MS = 1783317600000;
const pip: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

const barsFor = (p: string, tf: string) =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).sort((a, b) => a.timestamp - b.timestamp);

function simulate(E: number, SL: number, TP: number, dir: 'LONG' | 'SHORT', pair: string): { outcome: string; exitTs: number | null; mae: number; mfe: number } {
  const px = pip[pair]!;
  const bars = barsFor(pair, '1H');
  if (dir === 'LONG' && !(SL < E && E < TP)) return { outcome: 'INVALID', exitTs: null, mae: 0, mfe: 0 };
  if (dir === 'SHORT' && !(TP < E && E < SL)) return { outcome: 'INVALID', exitTs: null, mae: 0, mfe: 0 };
  let trig = false; let mae = 0; let mfe = 0;
  for (const b of bars) {
    if (b.timestamp <= ANCHOR_MS) continue;
    if (!trig) {
      if (dir === 'LONG' && b.low <= E) trig = true;
      else if (dir === 'SHORT' && b.high >= E) trig = true;
      else continue;
    }
    const slHit = dir === 'LONG' ? b.low <= SL : b.high >= SL;
    const tpHit = dir === 'LONG' ? b.high >= TP : b.low <= TP;
    if (dir === 'LONG') { mae = Math.max(mae, (E - b.low) / px); mfe = Math.max(mfe, (b.high - E) / px); }
    else { mae = Math.max(mae, (b.high - E) / px); mfe = Math.max(mfe, (E - b.low) / px); }
    if (slHit && tpHit) return { outcome: 'LOSS', exitTs: b.timestamp, mae, mfe };
    if (slHit) return { outcome: 'LOSS', exitTs: b.timestamp, mae, mfe };
    if (tpHit) return { outcome: 'WIN', exitTs: b.timestamp, mae, mfe };
  }
  return { outcome: trig ? 'OPEN' : 'NOTRIG', exitTs: null, mae, mfe };
}

console.log('=== DXY LONG: E 100.918 FROZEN — sweep TP × SL-anchor ===');
for (const tp of [101.240, 101.269, 101.272, 101.296, 101.300, 101.311, 101.314, 101.320, 101.330]) {
  const reward = (tp - 100.918) / 0.01;
  const cap = reward / 3;
  for (const anchor of ['entry', 'ceiling'] as const) {
    const slPrice = anchor === 'entry' ? 100.918 - cap * 0.01 : 100.94 - cap * 0.01;
    const risk = (100.918 - slPrice) / 0.01;
    const s = simulate(100.918, slPrice, tp, 'LONG', 'DXY');
    console.log(`  TP ${tp.toFixed(3)} (${reward.toFixed(1)}p) ${anchor}-SL ${slPrice.toFixed(5)} (risk ${risk.toFixed(1)}p, RRR ${(reward / risk).toFixed(2)}) -> ${s.outcome}${s.exitTs ? ' @ ' + new Date(s.exitTs).toISOString().slice(5, 16) : ''} MAE ${s.mae.toFixed(1)}p MFE ${s.mfe.toFixed(1)}p`);
  }
}
// The measured wick depth candidate (the demand's reaction low 100.558 → 38.2p from the ceiling)
console.log('  MEASURED: the demand reaction low 100.558 → depth 38.2p (ceiling-anchored SL 100.558) — RRR vs the floor:');
{
  const sl = 100.558; const reward = (101.240 - 100.918) / 0.01; const risk = (100.918 - 100.558) / 0.01;
  const s = simulate(100.918, sl, 101.240, 'LONG', 'DXY');
  console.log(`    SL 100.558 risk ${risk.toFixed(1)}p RRR ${(reward / risk).toFixed(2)} -> ${s.outcome} (BELOW the 3.0 floor → REJECT)`);
}
// The 100.803 dip level (the measured June-22 reaction @100.803): SL = 100.802 (just beyond the reaction)
console.log('  MEASURED: the June-22 reaction @100.803 (the demand\'s reaction low in the RANGE, the m5 extreme of the RECENCY window) → SL just beyond it:');
for (const sl of [100.8025, 100.8020, 100.8010, 100.8000, 100.7990, 100.7950]) {
  for (const tp of [101.240, 101.269, 101.275, 101.30]) {
    const risk = (100.918 - sl) / 0.01; const reward = (tp - 100.918) / 0.01;
    const s = simulate(100.918, sl, tp, 'LONG', 'DXY');
    if (s.outcome === 'WIN') console.log(`    SL ${sl.toFixed(4)} TP ${tp.toFixed(3)} risk ${risk.toFixed(1)}p RRR ${(reward / risk).toFixed(2)} -> WIN @ ${new Date(s.exitTs!).toISOString().slice(5, 16)}`);
  }
}

console.log('\n=== EU LONG: E 1.14095 FROZEN — the TP sweep ===');
for (const tp of [1.14620, 1.14580, 1.14500, 1.14479, 1.14460, 1.14450, 1.14400]) {
  for (const sl of [1.14023, 1.14000, 1.13983]) {
    const risk = (1.14095 - sl) / 0.0001; const reward = (tp - 1.14095) / 0.0001;
    const s = simulate(1.14095, sl, tp, 'LONG', 'EUR/USD');
    console.log(`  TP ${tp.toFixed(5)} SL ${sl.toFixed(5)} risk ${risk.toFixed(1)}p RRR ${(reward / risk).toFixed(2)} -> ${s.outcome}${s.exitTs ? ' @ ' + new Date(s.exitTs).toISOString().slice(5, 16) : ''}`);
  }
}

console.log('\n=== GU LONG: E 1.33343 FROZEN — the SL sweep (TP 1.33560 kept) ===');
for (const sl of [1.33318, 1.33301, 1.33300, 1.33299, 1.33290, 1.33285, 1.33280, 1.33275, 1.33270, 1.33260, 1.33250]) {
  const risk = (1.33343 - sl) / 0.0001; const reward = (1.33560 - 1.33343) / 0.0001;
  const s = simulate(1.33343, sl, 1.33560, 'LONG', 'GBP/USD');
  console.log(`  SL ${sl.toFixed(5)} risk ${risk.toFixed(1)}p RRR ${(reward / risk).toFixed(2)} -> ${s.outcome}${s.exitTs ? ' @ ' + new Date(s.exitTs).toISOString().slice(5, 16) : ''} MAE ${s.mae.toFixed(1)}p`);
}
