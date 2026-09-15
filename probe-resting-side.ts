/**
 * probe-resting-side.ts — THE SEMANTICS FIX acceptance probe #2: the
 * RESTING-SIDE LAW (a rung's type = the structure it sits in).
 *
 * THE ASSERTION: after the resting-side pass, the #2 pocket's zone TYPE =
 * DEMAND when its band is FULLY contained within a DEMAND zone (the
 * operator's demand [1.14145-1.14000] region). The probe prints the
 * pocket's type BEFORE (the vote-based — the derailment-era SUPPLY) vs
 * AFTER (the structure-based — DEMAND).
 *
 * Runs on the LEGACY (unlocked) model — the pocket cluster's band
 * [1.14080, 1.14120] (id LMV|EUR/USD|1.14080) is the derailment-era
 * structure the S1/S2 measurements documented.
 */

import { readFileSync } from 'node:fs';
import { buildChartModel } from './src/mdve/index.js';
import type { ZoneModel } from './src/mdve/types.js';
import type { LqzZoneMatrix } from './src/mdve/lmv.js';
import { classifyRungsByStructure } from './src/mdve/resting-side.js';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000;   // the report's week anchor (2026-07-10T17:00Z)
const WEEK = '2026-07-06';
const FIXTURE = process.env.BARS_FIXTURE ?? ['/tmp', 'opencode', 'bars_raw.json'].join('/');
const POCKET_ID = 'LMV|EUR/USD|1.14080';   // the pocket rung (band [1.14080, 1.14120])

function main(): void {
  let failures = 0;
  const fail = (msg: string): void => { failures++; console.log(`  [FAIL] ${msg}`); };
  const pass = (msg: string): void => console.log(`  [PASS] ${msg}`);

  console.log('=== probe-resting-side.ts — the resting-side law ===');
  console.log('');

  const raw: Array<{ pair: string; timeframe: string; bars: OHLCBar[] }> =
    JSON.parse(readFileSync(FIXTURE, 'utf8'));
  // The legacy no-arg runner's exact pattern (no lock, no gate — the
  // ANCHOR_MS fallback, byte-identical).
  const barsFor = (pair: string, tf: string): OHLCBar[] =>
    (raw.find((r) => r.pair === pair && r.timeframe === tf)?.bars ?? [])
      .filter((b) => b.timestamp <= ANCHOR_MS)
      .sort((a, b) => a.timestamp - b.timestamp);
  const spotFor = (pair: string): number => {
    const b = barsFor(pair, '4H');
    return b.length ? b[b.length - 1]!.close : 0;
  };

  const spot = spotFor('EUR/USD');
  const model = buildChartModel(
    'EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'),
    barsFor('EUR/USD', '30m'), spot,
  );

  // ── THE POCKET ZONE — the bridged rung LMV|EUR/USD|1.14080 (the band
  //    [1.14080, 1.14120]). ──
  const pocket: ZoneModel | undefined = model.zones.find(
    (z) => z.id === POCKET_ID || (z.id.startsWith('LMV|') && Math.abs(z.bottom - 1.14080) < 1e-4 && Math.abs(z.top - 1.14120) < 1e-4),
  );
  if (!pocket) {
    console.log('  [FAIL] the pocket zone (LMV|EUR/USD|1.14080 / band [1.14080, 1.14120]) not found in the model — abort');
    console.log(`  FINAL VERDICT: FAIL (${failures} failure${failures === 1 ? '' : 's'})`);
    process.exit(1);
  }
  const rung: LqzZoneMatrix | undefined = model.lmv.table.find(
    (z) => Math.abs(z.center - 1.14080) < 1e-4 && Math.abs(z.bottom - 1.14080) < 1e-4 && Math.abs(z.top - 1.14120) < 1e-4,
  );
  console.log('THE POCKET (the #2 level):');
  console.log(`  id   : ${pocket.id}`);
  console.log(`  band : [${pocket.bottom.toFixed(5)}, ${pocket.top.toFixed(5)}]`);
  if (rung) console.log(`  vote : ${rung.side} (the LqzMatrixEntry.side — the battle behavior, never touched by the pass)`);
  console.log('');

  // ── THE BEFORE STATE (the vote-based type — what matrixZonesToZoneModels
  //    assigned: BUY_SIDE → DEMAND, SELL_SIDE → SUPPLY). ──
  const beforeType: 'SUPPLY' | 'DEMAND' = (rung?.side ?? 'SELL_SIDE') === 'BUY_SIDE' ? 'DEMAND' : 'SUPPLY';
  console.log(`BEFORE (the vote-based type): ${beforeType}`);

  // ── THE AFTER STATE (the structure-based type — buildChartModel runs the
  //    resting-side pass internally on the assembled pool). ──
  const afterTypeBuild: 'SUPPLY' | 'DEMAND' = pocket.type;
  console.log(`AFTER  (the structure-based type, via buildChartModel): ${afterTypeBuild}`);

  // ── THE CONTAINING STRUCTURE — the narrowest non-LMV zone fully
  //    containing the pocket band (the structural resting side). ──
  const containers = model.zones.filter(
    (z) =>
      !z.id.startsWith('LMV|') &&
      pocket.bottom >= z.bottom - 1e-9 &&
      pocket.top <= z.top + 1e-9,
  );
  if (containers.length === 0) {
    console.log('  [WARN] no non-LMV zone fully contains the pocket band — the vote-based type stands (honest)');
  } else {
    const narrowest = containers.reduce((a, b) =>
      (a.top - a.bottom) <= (b.top - b.bottom) ? a : b,
    );
    console.log(`  containing structure (narrowest of ${containers.length}): ${narrowest.id} type=${narrowest.type} band=[${narrowest.bottom.toFixed(5)}, ${narrowest.top.toFixed(5)}] (width ${(narrowest.top - narrowest.bottom).toFixed(5)})`);
    if (containers.length > 1) {
      console.log('  all containers:');
      for (const c of [...containers].sort((a, b) => (a.top - a.bottom) - (b.top - b.bottom))) {
        console.log(`    ${c.id} type=${c.type} band=[${c.bottom.toFixed(5)}, ${c.top.toFixed(5)}] width=${(c.top - c.bottom).toFixed(5)}`);
      }
    }
  }
  console.log('');

  // ── THE DIRECT IN-PLACE DEMONSTRATION: reset the pocket's type to the
  //    vote-based BEFORE, run classifyRungsByStructure(model.zones)
  //    directly, re-extract — the pass itself is proven in place. ──
  pocket.type = beforeType;
  classifyRungsByStructure(model.zones);
  const afterTypeDirect: 'SUPPLY' | 'DEMAND' = pocket.type;
  console.log(`DIRECT IN-PLACE CALL: reset type → ${beforeType}, classifyRungsByStructure(model.zones) → ${afterTypeDirect}`);

  // ── THE ASSERTION: contained in a DEMAND zone → the type = DEMAND. ──
  console.log('');
  console.log('ASSERTION — the pocket band contained within a DEMAND zone → type = DEMAND:');
  const containedInDemand = containers.some((c) => c.type === 'DEMAND');
  if (containedInDemand) {
    if (afterTypeBuild === 'DEMAND' && afterTypeDirect === 'DEMAND') {
      pass(`the pocket [${pocket.bottom.toFixed(5)}, ${pocket.top.toFixed(5)}] is contained within a DEMAND zone → its type = DEMAND (BEFORE ${beforeType} → AFTER ${afterTypeBuild}) — the native demand lane can now see it`);
    } else {
      fail(`contained in a DEMAND zone but the type = ${afterTypeBuild} (direct: ${afterTypeDirect}) — expected DEMAND`);
    }
  } else if (containers.length > 0 && containers.every((c) => c.type === 'SUPPLY')) {
    if (afterTypeBuild === 'SUPPLY' && afterTypeDirect === 'SUPPLY') {
      pass(`the pocket is contained within SUPPLY zones only → its type = SUPPLY (the honest structural identity)`);
    } else {
      fail(`contained in SUPPLY only but the type = ${afterTypeBuild} — expected SUPPLY`);
    }
  } else {
    fail(`no unambiguous container — the vote-based type ${beforeType} stands (the probe cannot assert a flip)`);
  }

  console.log('');
  if (failures === 0) {
    console.log('  FINAL VERDICT: PASS');
  } else {
    console.log(`  FINAL VERDICT: FAIL (${failures} failure${failures === 1 ? '' : 's'})`);
    process.exit(1);
  }
}

main();
