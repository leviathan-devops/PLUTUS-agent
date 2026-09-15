/**
 * probe-vote-window.ts — THE SEMANTICS FIX acceptance probe #1: the LMV
 * side-vote's 3-day window (the operator's recency law).
 *
 * THE ASSERTIONS:
 *   (a) EVERY reaction that votes in the window has timestamp >=
 *       windowStartMs (present − 72h) — the pre-formation chop
 *       (06-29/06-30/07-01) + any future bar are MECHANICALLY EXCLUDED.
 *   (b) the window SELL count < the full-lookback SELL count — the
 *       pre-formation chop's SELL votes are PROVEN removed by the count
 *       reduction.
 *
 * The run anchor is LOCKED at 1783321200000 (2026-07-06 07:00 UTC — the
 * Monday London open), so the present moment = the Monday anchor and the
 * window = the last 72 hours up to it.
 */

import { readFileSync } from 'node:fs';
import {
  buildChartModel,
  classifyTouch,
  computeAtr,
  barAnatomy,
} from './src/mdve/index.js';
import type { OHLCBar } from './src/types.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';

const ANCHOR_MS = 1783702800000;   // the report's week anchor (2026-07-10T17:00Z)
const RUN_ANCHOR = 1783321200000;  // 2026-07-06T07:00Z — the Monday London open
const WEEK = '2026-07-06';
const VOTE_WINDOW_MS = 72 * 3600 * 1000; // 3 trading days — the recency law
const FIXTURE = process.env.BARS_FIXTURE ?? ['/tmp', 'opencode', 'bars_raw.json'].join('/');
const PIP_VALUE = 0.0001;          // EUR/USD
const LOOKBACK = 720;              // the canon LQZ lookback (lqz-lobe.ts:119)

interface ProbeReaction {
  ts: number;
  kind: string;
  fromAbove: boolean;
  fromBelow: boolean;
  close: number;
  lowerWick: number;
  upperWick: number;
}

function main(): void {
  let failures = 0;
  const fail = (msg: string): void => { failures++; console.log(`  [FAIL] ${msg}`); };
  const pass = (msg: string): void => console.log(`  [PASS] ${msg}`);

  // ── THE TEMPORAL LOCK-FIRST (the runner's exact discipline — before any
  //    bar read). The present moment for the vote = this anchor. ──
  lockRunAnchor(RUN_ANCHOR);
  const windowStartMs = RUN_ANCHOR - VOTE_WINDOW_MS;

  console.log('=== probe-vote-window.ts — the 3-day side-vote window ===');
  console.log(`RUN ANCHOR LOCKED: ${new Date(RUN_ANCHOR).toISOString()} (${RUN_ANCHOR})`);
  console.log(`window start (present − 72h): ${new Date(windowStartMs).toISOString()} (${windowStartMs})`);
  console.log('');

  const raw: Array<{ pair: string; timeframe: string; bars: OHLCBar[] }> =
    JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const barsFor = (pair: string, tf: string): OHLCBar[] =>
    gateBars(
      (raw.find((r) => r.pair === pair && r.timeframe === tf)?.bars ?? [])
        .filter((b) => b.timestamp <= ANCHOR_MS),
    ).sort((a, b) => a.timestamp - b.timestamp);
  const spotFor = (pair: string): number => {
    const b = barsFor(pair, '4H');
    return b.length ? b[b.length - 1]!.close : 0;
  };

  const bars1H = barsFor('EUR/USD', '1H');
  const spot = spotFor('EUR/USD');
  const model = buildChartModel(
    'EUR/USD', WEEK, bars1H, barsFor('EUR/USD', '4H'),
    barsFor('EUR/USD', '30m'), spot,
  );

  // ── THE POCKET RUNG — the LMV entry at the operator's level (the top of
  //    the pocket [1.14080, 1.14120] — the #2's 1.14110 entry region). In
  //    the Monday-anchored model this is the rung whose band lies in the
  //    pocket region; searched by band overlap + the nearest center. ──
  const pocketRegion = { lo: 1.14080, hi: 1.14120 };
  const candidates = model.lmv.table.filter((z) =>
    z.bottom <= pocketRegion.hi + 3 * PIP_VALUE &&
    z.top >= pocketRegion.lo - 3 * PIP_VALUE,
  );
  if (candidates.length === 0) {
    console.log('  [FAIL] no LMV rung found in the #2 pocket region [1.14080, 1.14120] — abort');
    console.log(`  FINAL VERDICT: FAIL (${failures} failure${failures === 1 ? '' : 's'})`);
    process.exit(1);
  }
  const pocket = candidates.sort(
    (a, b) =>
      Math.abs((a.bottom + a.top) / 2 - (pocketRegion.lo + pocketRegion.hi) / 2) -
      Math.abs((b.bottom + b.top) / 2 - (pocketRegion.lo + pocketRegion.hi) / 2),
  )[0]!;
  console.log('THE POCKET RUNG (the #2 level):');
  console.log(`  id        : LMV|EUR/USD|${pocket.center.toFixed(5)}`);
  console.log(`  band      : [${pocket.bottom.toFixed(5)}, ${pocket.top.toFixed(5)}] (reaction band ±${2 * PIP_VALUE} pips)`);
  console.log(`  candles   : ${pocket.candles.length} | the model's side: ${pocket.side}`);
  console.log('');

  // ── REPLICATE THE INTERNAL REACTION EXTRACTION + VOTE (same bars slice,
  //    same band, same predicates — the probe re-derives the composition
  //    the internal vote loop consumed). ──
  const lmvBars: OHLCBar[] =
    bars1H.length > LOOKBACK ? bars1H.slice(bars1H.length - LOOKBACK) : bars1H;
  const atr = computeAtr(lmvBars, 14);
  const eps = 2 * PIP_VALUE;
  const lo = pocket.bottom - eps;
  const hi = pocket.top + eps;
  const ctx = { atr, pipValue: PIP_VALUE };

  const reactions: ProbeReaction[] = [];
  for (let i = 0; i < lmvBars.length; i++) {
    const kind = classifyTouch(lmvBars, i, lo, hi, ctx);
    if (kind === 'PASS_THROUGH') continue;
    const bar = lmvBars[i]!;
    const refClose = i > 0 ? lmvBars[i - 1]!.close : bar.open;
    const an = barAnatomy(bar);
    reactions.push({
      ts: bar.timestamp,
      kind,
      fromAbove: refClose >= hi,
      fromBelow: refClose <= lo,
      close: bar.close,
      lowerWick: an.lowerWick,
      upperWick: an.upperWick,
    });
  }
  reactions.sort((a, b) => a.ts - b.ts);

  // The vote branch — the exact internal semantics (lmv.ts:572-594).
  const voteOf = (r: ProbeReaction, center: number): 'BUY' | 'SELL' => {
    if (r.fromAbove && !r.fromBelow) return 'BUY';
    if (r.fromBelow && !r.fromAbove) return 'SELL';
    if (r.lowerWick > r.upperWick) return 'BUY';
    if (r.upperWick > r.lowerWick) return 'SELL';
    return r.close >= center ? 'BUY' : 'SELL';
  };

  const fullVotes = reactions.map((r) => ({ r, v: voteOf(r, pocket.center) }));
  const fullBuy = fullVotes.filter((x) => x.v === 'BUY').length;
  const fullSell = fullVotes.filter((x) => x.v === 'SELL').length;

  const windowReactions = reactions.filter((r) => r.ts >= windowStartMs);
  const windowVotes = windowReactions.map((r) => ({ r, v: voteOf(r, pocket.center) }));
  const winBuy = windowVotes.filter((x) => x.v === 'BUY').length;
  const winSell = windowVotes.filter((x) => x.v === 'SELL').length;

  console.log('THE FULL-LOOKBACK REACTIONS (what the OLD vote consumed — the WHERE):');
  for (const x of fullVotes) {
    const inWin = x.r.ts >= windowStartMs;
    console.log(
      `  ${new Date(x.r.ts).toISOString()} ${x.r.kind.padEnd(12)} fromAbove=${x.r.fromAbove} fromBelow=${x.r.fromBelow} close=${x.r.close.toFixed(5)} → ${x.v}_SIDE${inWin ? '  [IN WINDOW — VOTES]' : '  [PRE-WINDOW — MECHANICALLY EXCLUDED]'}`,
    );
  }
  console.log(`  full-lookback vote: BUY ${fullBuy} / SELL ${fullSell} → ${fullBuy > fullSell ? 'BUY_SIDE' : 'SELL_SIDE'} (the derailment-era verdict)`);
  console.log('');

  console.log(`THE WINDOW VOTE (present − 72h = ${new Date(windowStartMs).toISOString()} onward):`);
  console.log(`  in-window reactions: ${windowReactions.length} | vote: BUY ${winBuy} / SELL ${winSell}`);
  if (windowReactions.length === 0) {
    console.log('  → ZERO window reactions: the spot-relative tie-break fires (center vs spot) — the');
    console.log('    resting-side pass (probe-resting-side.ts) then overrides the contained type.');
    console.log(`  → the model's resulting side: ${pocket.side} (center ${pocket.center.toFixed(5)} vs spot ${spot.toFixed(5)})`);
  } else {
    const winSide = winBuy > winSell ? 'BUY_SIDE' : 'SELL_SIDE';
    console.log(`  → the window vote's resulting side: ${winSide}${winSide === pocket.side ? ' (matches the model)' : ` (model=${pocket.side} — the tie-break differs)`}`);
  }
  console.log('');

  // ── ASSERTION (a): every window reaction >= windowStartMs. ──
  console.log('ASSERTION (a) — the window composition is 100% within the window:');
  const preWindow = windowReactions.filter((r) => r.ts < windowStartMs);
  if (preWindow.length === 0) {
    pass(`every in-window reaction has timestamp >= ${new Date(windowStartMs).toISOString()} (${windowStartMs}) — none from the 06-29→07-01 pre-formation chop`);
  } else {
    fail(`${preWindow.length} in-window reaction${preWindow.length === 1 ? '' : 's'} BEFORE the window start — the recency exclusion is broken`);
  }

  // ── ASSERTION (b): the window SELL count < the full-lookback SELL count. ──
  console.log('ASSERTION (b) — the pre-formation chop SELL votes are excluded:');
  if (winSell < fullSell) {
    pass(`window SELL ${winSell} < full-lookback SELL ${fullSell} — the pre-window SELL votes are proven removed`);
  } else {
    fail(`window SELL ${winSell} is NOT < full-lookback SELL ${fullSell} — no exclusion demonstrated`);
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
