/**
 * RUNTIME VERIFICATION — Singular Origin Candle (Order Block) S/D construction.
 *
 * Proves:
 *  1. Bull breakout → DEMAND zone from the candle BEFORE the breakout
 *  2. Bear breakout → SUPPLY zone from the candle BEFORE the breakout
 *  3. Zone range == order block [Low, High] — NOT the impulse candle's range
 *  4. Breakout without ≥50-pip follow-through over ≥3 trading days → NO zone
 *  5. Prior-move ≥ threshold → MoM; origin of move → BoM
 */
import { construct4HZones } from '../src/brains/4h-sd-lobe.js';
import type { OHLCBar } from '../src/types.js';

const PIP = 0.0001;
let ts = 1_700_000_000_000;
const bar = (o: number, h: number, l: number, c: number): OHLCBar => {
  ts += 4 * 3600_000;
  return { timestamp: ts, open: o, high: h, low: l, close: c, volume: 1000 };
};
const flat = (price: number): OHLCBar =>
  bar(price, price + 2 * PIP, price - 2 * PIP, price + 1 * PIP); // ~3-pip bodies

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail: string) {
  if (cond) { pass++; console.log(`  PASS  ${name} — ${detail}`); }
  else { fail++; console.log(`  FAIL  ${name} — ${detail}`); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO A: Bull breakout → DEMAND zone from the PRE-breakout candle
// ─────────────────────────────────────────────────────────────────────────────
{
  const bars: OHLCBar[] = [];
  for (let i = 0; i < 30; i++) bars.push(flat(1.1000));          // 30 flat bars
  const OB = bar(1.1000, 1.1016, 1.0994, 1.1002);                // ORDER BLOCK (22-pip range)
  bars.push(OB);                                                  // index 30
  bars.push(bar(1.1002, 1.1034, 1.1000, 1.1030));                // BREAKOUT: 28-pip body, index 31
  let p = 1.1030;
  for (let i = 0; i < 17; i++) { p += 3 * PIP; bars.push(bar(p, p + 4 * PIP, p - 1 * PIP, p + 2 * PIP)); } // → 1.1080 (80-pip move)
  for (let i = 0; i < 11; i++) bars.push(flat(1.1078));          // hold high, spot near zone
  const spot = 1.1078;

  const zones = construct4HZones({ bars, instrument: 'EUR/USD', spot, pipValue: PIP });
  const demand = zones.filter((z) => z.type === 'BoM Demand');
  console.log(`\n[A] zones=${zones.length} bomDemand=${demand.length}`);
  check('A1: exactly one BoM demand zone (overlaps merged)', demand.length === 1, `got ${demand.length}`);
  if (demand[0]) {
    const z = demand[0];
    check('A2: zone floor == ORDER BLOCK low', Math.abs(z.floor - 1.0994) < 1e-9, `floor=${z.floor} (OB low=1.0994)`);
    check('A3: zone ceiling == ORDER BLOCK high', Math.abs(z.ceiling - 1.1016) < 1e-9, `ceiling=${z.ceiling} (OB high=1.1016)`);
    check('A4: zone is NOT the impulse candle range', !(Math.abs(z.floor - 1.1000) < 1e-9 && Math.abs(z.ceiling - 1.1034) < 1e-9), 'impulse was [1.1000, 1.1034]');
    check('A5: isBoM=true / sdType=BoM (origin of move)', z.isBoM === true && z.sdType === 'BoM', `isBoM=${z.isBoM} sdType=${z.sdType}`);
    check('A6: createdAt == origin candle timestamp (date-stamped)', z.createdAt === OB.timestamp, `createdAt=${z.createdAt} obTs=${OB.timestamp}`);
    check('A7: timeframe tagged 4H', z.timeframe === '4H', `tf=${z.timeframe}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO B: Bear breakout → SUPPLY zone from the PRE-breakout candle
// ─────────────────────────────────────────────────────────────────────────────
{
  const bars: OHLCBar[] = [];
  for (let i = 0; i < 30; i++) bars.push(flat(1.1000));
  const OB = bar(1.1002, 1.1014, 1.0992, 1.1000);                // ORDER BLOCK (22-pip range)
  bars.push(OB);                                                  // index 30
  bars.push(bar(1.1000, 1.1004, 1.0970, 1.0972));                // BREAKOUT bear: 28-pip body
  let p = 1.0972;
  for (let i = 0; i < 17; i++) { p -= 3 * PIP; bars.push(bar(p, p + 1 * PIP, p - 4 * PIP, p - 2 * PIP)); } // → 1.0922
  for (let i = 0; i < 11; i++) bars.push(flat(1.0925));
  const spot = 1.0925;

  const zones = construct4HZones({ bars, instrument: 'EUR/USD', spot, pipValue: PIP });
  const supply = zones.filter((z) => z.type === 'BoM Supply');
  console.log(`\n[B] zones=${zones.length} bomSupply=${supply.length}`);
  check('B1: exactly one BoM supply zone (overlaps merged)', supply.length === 1, `got ${supply.length}`);
  if (supply[0]) {
    const z = supply[0];
    check('B2: zone floor == ORDER BLOCK low', Math.abs(z.floor - 1.0992) < 1e-9, `floor=${z.floor} (OB low=1.0992)`);
    check('B3: zone ceiling == ORDER BLOCK high', Math.abs(z.ceiling - 1.1014) < 1e-9, `ceiling=${z.ceiling} (OB high=1.1014)`);
    check('B4: isBoM=true / sdType=BoM', z.isBoM === true && z.sdType === 'BoM', `isBoM=${z.isBoM} sdType=${z.sdType}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO C: Big breakout candle but NO ≥50-pip follow-through → NO zone
// ─────────────────────────────────────────────────────────────────────────────
{
  const bars: OHLCBar[] = [];
  for (let i = 0; i < 30; i++) bars.push(flat(1.1000));
  bars.push(bar(1.1000, 1.1008, 1.0996, 1.1002));                // order block candidate
  bars.push(bar(1.1002, 1.1034, 1.1000, 1.1030));                // breakout body
  for (let i = 0; i < 17; i++) bars.push(flat(1.1032));          // move stalls at +30 pips (< 50)
  for (let i = 0; i < 11; i++) bars.push(flat(1.1032));
  const zones = construct4HZones({ bars, instrument: 'EUR/USD', spot: 1.1032, pipValue: PIP });
  console.log(`\n[C] zones=${zones.length}`);
  check('C1: weak move (< 0.5 DXY over 3 days) produces NO zones', zones.length === 0, `got ${zones.length}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO D: Continuation breakout after an existing ≥50-pip rally → MoM
// ─────────────────────────────────────────────────────────────────────────────
{
  const bars: OHLCBar[] = [];
  let p = 1.0900;
  for (let i = 0; i < 30; i++) { p += 3.5 * PIP; bars.push(bar(p, p + 3 * PIP, p - 1 * PIP, p + 2 * PIP)); } // rally ≈ 63 pips inside the 18-bar lookback
  const obLevel = p;
  bars.push(bar(obLevel, obLevel + 14 * PIP, obLevel - 8 * PIP, obLevel + 2 * PIP)); // ORDER BLOCK (22-pip range)
  bars.push(bar(obLevel + 2 * PIP, obLevel + 34 * PIP, obLevel, obLevel + 30 * PIP)); // BREAKOUT
  p = obLevel + 30 * PIP;
  for (let i = 0; i < 17; i++) { p += 3 * PIP; bars.push(bar(p, p + 4 * PIP, p - 1 * PIP, p + 2 * PIP)); }
  for (let i = 0; i < 11; i++) bars.push(flat(p));
  const zones = construct4HZones({ bars, instrument: 'EUR/USD', spot: p, pipValue: PIP });
  const mom = zones.filter((z) => z.type === 'MoM Demand');
  console.log(`\n[D] zones=${zones.length} momDemand=${mom.length}`);
  check('D1: continuation zone classified MoM', mom.length === 1, `got ${mom.length} (types: ${zones.map(z => z.type).join(', ') || 'none'})`);
  if (mom[0]) check('D2: MoM zone still uses order block range', Math.abs(mom[0].floor - (obLevel - 8 * PIP)) < 1e-9 && Math.abs(mom[0].ceiling - (obLevel + 14 * PIP)) < 1e-9, `floor=${mom[0].floor} ceiling=${mom[0].ceiling}`);
}

console.log(`\n═══════════════════════════════════`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
