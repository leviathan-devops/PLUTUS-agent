/**
 * PROBE-WADM5-BARS — the exact post-anchor bar sequences for the three losing
 * lanes. Read-only instrumentation; NO source changes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface RawFeed { pair: string; timeframe: string; bars: { timestamp: number; open: number; high: number; low: number; close: number }[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const ANCHOR_MS = 1783317600000; // 2026-07-06T06:00:00Z
const pip: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

const barsFor = (p: string, tf: string, from: number, to: number) =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp >= from && b.timestamp <= to)
    .sort((a, b) => a.timestamp - b.timestamp);

function dump(pair: string, fromMs: number, toMs: number, label: string, markers: Array<{ name: string; price: number }>): void {
  const bars = barsFor(pair, '1H', fromMs, toMs);
  const px = pip[pair]!;
  console.log(`\n=== ${pair} ${label} (${bars.length} bars, ${new Date(fromMs).toISOString()} → ${new Date(toMs).toISOString()}) ===`);
  for (const b of bars) {
    const marks = markers
      .filter((m) => (b.low <= m.price && b.high >= m.price))
      .map((m) => m.name)
      .join(',');
    const markStr = marks ? `  <-- ${marks}` : '';
    console.log(`  ${new Date(b.timestamp).toISOString().slice(5, 16)} O ${b.open.toFixed(5)} H ${b.high.toFixed(5)} L ${b.low.toFixed(5)} C ${b.close.toFixed(5)}${markStr}`);
  }
}

const DAY = 86400000;
// DXY: trigger 17:00 Jul 6 (E 100.918), SL-hit 01:00 Jul 7 (SL 100.83267). The dip + the recovery.
dump('DXY', ANCHOR_MS + 11 * 3600000, ANCHOR_MS + 5 * DAY, 'the dip + recovery window (Jul 6 17:00 → Jul 11 06:00)', [
  { name: 'E 100.918', price: 100.918 }, { name: 'SL 100.83267', price: 100.83267 },
  { name: 'dip 100.803', price: 100.803 }, { name: 'Thu 100.786', price: 100.786 },
  { name: 'TP 101.240', price: 101.240 }, { name: 'TP 101.314', price: 101.314 },
]);
// EUR: trigger 13:00 Jul 6 (E 1.14095), SL-hit 21:00 Jul 7 (SL 1.14023). MFE 1.14480.
dump('EUR/USD', ANCHOR_MS + 7 * 3600000, ANCHOR_MS + 3 * DAY, 'the MFE + SL window (Jul 6 13:00 → Jul 9 06:00)', [
  { name: 'E 1.14095', price: 1.14095 }, { name: 'SL 1.14023', price: 1.14023 },
  { name: 'MFE 1.14480', price: 1.14480 }, { name: 'TP 1.14620', price: 1.14620 },
  { name: 'TP 1.14479', price: 1.14479 }, { name: 'def 1.1400', price: 1.14000 },
]);
// GU: trigger + SL-hit 07:00 Jul 6 (E 1.33343, SL 1.33318). The dip 1.33286 + the recovery.
dump('GBP/USD', ANCHOR_MS, ANCHOR_MS + 4 * DAY, 'the dip + recovery window (Jul 6 06:00 → Jul 10 06:00)', [
  { name: 'E 1.33343', price: 1.33343 }, { name: 'SL 1.33318', price: 1.33318 },
  { name: 'dip 1.33286', price: 1.33286 }, { name: 'def 1.33301', price: 1.33301 },
  { name: 'TP 1.33560', price: 1.33560 },
]);
