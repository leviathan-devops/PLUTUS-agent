#!/usr/bin/env bun
/**
 * fetch-bars.ts — THE BROKER-CORRECTED DATA FETCH
 *
 * THE MISSION (the operator's broker law — VERBATIM):
 *   "The golden trades are all on the ICE broker. you need to use the data
 *    from the same broker so the candles match or we will have variance that
 *    causes derailments like these."
 *   "these brokers are ON tradingview. tvdatafeed should have a broker filter
 *    so you can get accurate data from the correct broker"
 *
 * The golden doc's own headers name the broker per pair:
 *   MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md line 5:
 *     "EURUSD (ICE Broker Chart Data)"
 *   ... line 59:
 *     "GBPUSD (OANDA Broker Chart Data)"
 *   The DXY is the ICE Dollar Index (TradingView's DXY = the ICE index).
 *
 * This script fetches the RawFeed contract (the shape the runners consume —
 * diag-golden-coverage.ts:48-50 reads the /tmp/opencode/bars_raw.json fixture
 * as RawFeed[] and feeds it into buildChartModel) from the broker-corrected
 * TradingView feed per pair, so the candles match the operator's charts.
 *
 * THE OUTPUT FORMAT (must be byte-compatible with the fixture):
 *   RawFeed = { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null }
 *   OHLCBar = { timestamp: number (unix ms); open; high; low; close; volume }
 *   (volume matches src/types.ts:141-148 + the fixture's bar shape)
 *
 * THE ARGS:
 *   bun scripts/fetch-bars.ts --dry-run          — print the fetch matrix, NO network, exit 0
 *   bun scripts/fetch-bars.ts                    — live fetch + write --out + exit (0 = >=1 pair fetched)
 *   bun scripts/fetch-bars.ts --out=<path>       — output path (default = the tmpdir/opencode/bars_raw.json)
 *   bun scripts/fetch-bars.ts --pairs=EUR/USD,GBP/USD — the pair filter (partial re-fetch)
 *   bun scripts/fetch-bars.ts --broker=AUD/USD:OANDA — the broker override for a PROPOSED pair
 *   unknown flags are ignored with a logged note (never a silent crash)
 *
 * THE DEPENDENCY (HONEST):
 *   The JS `tvdatafeed` port is ABSENT from node_modules and package.json
 *   (verified 2026-08-06). The repo's ground-truth tvdatafeed integration is
 *   the PYTHON wrapper scripts/tv_datafeed.py — where the `exchange` param of
 *   get_hist IS the broker filter (scripts/tv_datafeed.py:35). Install the JS
 *   port before a live run:
 *       bun add tvdatafeed        (or: npm install tvdatafeed)
 *   The `exchange` values below are DOCUMENTED-PROPOSED (they must be verified
 *   against the installed library's exchange list on first live use) — never
 *   asserted as fact. The --dry-run validates the plumbing WITHOUT the network
 *   and WITHOUT the library.
 *
 * THE FAILURE MODES (each handled — no fake success, no silent crash):
 *   - lib absent      → per-cell RawFeed.error = [DEP] ... with the install remedy
 *   - network down    → per-cell RawFeed.error = [NET] ... with the retry remedy
 *   - malformed bars  → invalid bars dropped, the count logged, the honest bars kept
 *   - empty response  → RawFeed.error = the honest message, bars = []
 *   - PROPOSED broker → the pair is fetched ONLY with a --broker override;
 *                       otherwise the cell records the honest [BROKER] note
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════
// THE CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════

interface OHLCBar {
  timestamp: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** The RawFeed contract — every runner consumes THIS shape (diag-golden-coverage.ts:48). */
interface RawFeed {
  pair: string;
  timeframe: string;
  bars: OHLCBar[];
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE BROKER MAP (the operator's law — the per-pair broker REQUIREMENT)
// ═══════════════════════════════════════════════════════════════════════════

const BROKER_MAP: Readonly<Record<string, string>> = {
  'DXY': 'ICE',          // the ICE Dollar Index (TradingView's DXY = the ICE index)
  'EUR/USD': 'ICE',      // golden doc line 5: "EURUSD (ICE Broker Chart Data)"
  'GBP/USD': 'OANDA',    // golden doc line 59: "GBPUSD (OANDA Broker Chart Data)"
  'AUD/USD': 'PROPOSED', // the operator's default unknown — PROPOSED, never invented
};

const PAIRS: readonly string[] = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];

/**
 * broker → the TradingView data feed id (the tvdatafeed `exchange` param = THE
 * broker filter, per scripts/tv_datafeed.py:35). DOCUMENTED-PROPOSED — verify
 * against the installed tvdatafeed's exchange list on first live use.
 * DXY: TradingView's symbol is TVC:DXY — the repo's own wrapper documents
 * `--exchange TVC` for DXY (scripts/tv_datafeed.py:9); the ICE requirement is
 * on the INDEX itself, delivered through the TVC feed.
 */
const BROKER_EXCHANGE_MAP: Readonly<Record<string, string>> = {
  'ICE': 'ICEMARKETS',   // PROPOSED — TradingView's ICE data feed id (verify)
  'OANDA': 'OANDA',      // PROPOSED — TradingView's OANDA feed id (verify)
  'PROPOSED': '',        // unset until the operator confirms the AUD/USD broker
  'TVC': 'TVC',          // the DXY index feed (scripts/tv_datafeed.py:9)
};

// the pair → the concrete exchange id used at get_hist time.
// AUD/USD (PROPOSED) resolves to '' and is gated (see fetchCell).
function exchangeFor(pair: string): string {
  const broker = BROKER_MAP[pair] ?? '';
  if (pair === 'DXY') return BROKER_EXCHANGE_MAP['TVC'] ?? 'TVC';
  return BROKER_EXCHANGE_MAP[broker] ?? '';
}

// ═══════════════════════════════════════════════════════════════════════════
// THE MATRIX — 4 pairs x 4 timeframes.
// The lookback per timeframe covers the CURRENT fixture's measured spans
// (verified 2026-08-06): 1H 1500 bars ≈ 62 days, 4H 500 ≈ 83 days,
// 30m 500 ≈ 10 days, 15m 300 ≈ 3 days.
// ═══════════════════════════════════════════════════════════════════════════

interface TimeframeSpec {
  id: string;
  nBars: number;
  /** the tvdatafeed interval token — the string forms vary by port; the single
   *  place to adjust when the installed lib uses a different convention. */
  interval: string;
  spanDays: number; // the measured span of the current fixture for this TF
}

const TIMEFRAMES: readonly TimeframeSpec[] = [
  { id: '1H', nBars: 1500, interval: '1h', spanDays: 62 },
  { id: '4H', nBars: 500, interval: '4h', spanDays: 83 },
  { id: '30m', nBars: 500, interval: '30m', spanDays: 10 },
  { id: '15m', nBars: 300, interval: '15m', spanDays: 3 },
];

// ═══════════════════════════════════════════════════════════════════════════
// THE tvdatafeed API (documented — the JS port is absent in this repo).
// The `exchange` param IS the broker filter (scripts/tv_datafeed.py:35).
// ═══════════════════════════════════════════════════════════════════════════

/** The minimal documented surface of a TvDatafeed instance. */
interface TvDatafeedLike {
  get_hist(args: {
    symbol: string;
    exchange: string;
    interval: string;
    n_bars: number;
    extended_session?: boolean;
  }): unknown;
}

const TVDATAFEED_INSTALL_REMEDY =
  "[DEP] the JS 'tvdatafeed' port is not installed. Remedy: run 'bun add tvdatafeed' " +
  "(or 'npm install tvdatafeed') in the project root, then re-run this script. " +
  "Reference: the repo's Python wrapper scripts/tv_datafeed.py uses TvDatafeed().get_hist(...) " +
  "where the 'exchange' param is the broker filter.";

let feedPromise: Promise<TvDatafeedLike> | null = null;

/** Resolve the tvdatafeed module lazily (import() caches after the first call). */
async function resolveFeed(): Promise<TvDatafeedLike> {
  if (feedPromise) return feedPromise;
  feedPromise = (async () => {
    // the VARIABLE specifier keeps tsc from statically resolving the absent
    // package (a literal 'tvdatafeed' would be a TS2307 at compile time).
    const libName = 'tvdatafeed';
    let mod: unknown;
    try {
      mod = await import(libName);
    } catch (err) {
      throw new Error(TVDATAFEED_INSTALL_REMEDY + ' (import failed: ' + String(err) + ')');
    }
    const candidate: unknown =
      (mod as { default?: unknown })?.default ?? (mod as { TvDatafeed?: unknown })?.TvDatafeed ?? mod;
    if (typeof candidate !== 'function') {
      throw new Error(
        "[SHAPE] the installed tvdatafeed module has no usable TvDatafeed constructor " +
        "(got " + typeof candidate + "). Verify the API against the installed version and " +
        "adjust the resolution in resolveFeed().",
      );
    }
    // the constructor may take { broker } as the operator's "broker filter";
    // the repo's Python reference passes nothing. Documented + defensive.
    const Ctor = candidate as new (opts?: Record<string, unknown>) => { get_hist: TvDatafeedLike['get_hist'] };
    const inst = new Ctor({ broker: undefined });
    if (typeof inst.get_hist !== 'function') {
      throw new Error(
        "[SHAPE] the TvDatafeed instance exposes no get_hist method. Verify the API against " +
        "the installed version and adjust resolveFeed().",
      );
    }
    return { get_hist: inst.get_hist.bind(inst) };
  })();
  return feedPromise;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE BAR VALIDATION — honest data, never fabricated candles.
// ═══════════════════════════════════════════════════════════════════════════

function toValidBars(cands: unknown[], pair: string, tf: string): { bars: OHLCBar[]; dropped: number } {
  const bars: OHLCBar[] = [];
  let dropped = 0;
  for (const cand of cands) {
    if (cand === null || typeof cand !== 'object') {
      dropped++;
      continue;
    }
    const c = cand as Record<string, unknown>;
    const ts = Number(c.timestamp);
    const o = Number(c.open);
    const h = Number(c.high);
    const l = Number(c.low);
    const cl = Number(c.close);
    if (
      !Number.isFinite(ts) || !Number.isFinite(o) ||
      !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(cl)
    ) {
      dropped++;
      continue;
    }
    const v = Number(c.volume);
    bars.push({
      timestamp: ts,
      open: o,
      high: h,
      low: l,
      close: cl,
      volume: Number.isFinite(v) ? v : 0,
    });
  }
  // the deterministic order — the same ascending order as the fixture.
  bars.sort((a, b) => a.timestamp - b.timestamp);
  if (dropped > 0) {
    console.error(`[VALIDATE] ${pair} ${tf}: dropped ${dropped} malformed bar(s) (non-finite OHLC/timestamp)`);
  }
  return { bars, dropped };
}

/** Normalize a get_hist result into a bar-candidate array, whatever the port returns. */
function toCandidates(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (result !== null && typeof result === 'object') {
    const asObj = result as Record<string, unknown>;
    if (Array.isArray(asObj.bars)) return asObj.bars as unknown[];
    if (Array.isArray(asObj.data)) return asObj.data as unknown[];
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// THE FETCH — per (pair, timeframe) cell, the broker-selected feed, per-cell
// try/catch → the RawFeed.error field (never a silent crash).
// ═══════════════════════════════════════════════════════════════════════════

interface CellResult {
  entry: RawFeed;
  ok: boolean;
  skipped: boolean; // the PROPOSED-broker gate
  reason?: string;
}

const NET_REMEDY =
  "[NET] the broker feed did not respond in this environment. Remedy: verify network " +
  "reachability to TradingView's WebSocket feed, then re-run 'bun scripts/fetch-bars.ts'.";

async function fetchCell(pair: string, tf: TimeframeSpec, broker: string): Promise<CellResult> {
  const base = { pair, timeframe: tf.id };
  const error = (msg: string, ok = false, skipped = false, reason?: string): CellResult => ({
    entry: { ...base, bars: [], error: msg },
    ok,
    skipped,
    reason,
  });

  // the PROPOSED-broker gate — never invent a broker for AUD/USD.
  if (broker === 'PROPOSED') {
    return error(
      `[BROKER] pair ${pair} broker is PROPOSED (unconfirmed) — the operator must confirm it before ` +
      `this pair is fetched. Remedy: 'bun scripts/fetch-bars.ts --broker=${pair}:<BROKER>' ` +
      `(e.g. --broker=${pair}:OANDA).`,
      false,
      true,
      'PROPOSED broker (no --broker override)',
    );
  }

  const exchange = exchangeFor(pair);
  if (!exchange) {
    return error(
      `[BROKER] no TradingView exchange id mapped for broker '${broker}' on ${pair}. Remedy: add it to ` +
      `BROKER_EXCHANGE_MAP and verify against the installed tvdatafeed.`,
    );
  }

  try {
    const feed = await resolveFeed();
    const result: unknown = await feed.get_hist({
      symbol: pair,
      exchange,
      interval: tf.interval,
      n_bars: tf.nBars,
      extended_session: true,
    });
    const cands = toCandidates(result);
    if (cands.length === 0) {
      return error(
        `[EMPTY] ${pair} ${tf.id} (${broker}/${exchange}): the feed returned zero bars. ` +
        `Remedy: confirm the symbol/exchange/interval against the broker's TradingView listing, ` +
        `then re-run.`,
      );
    }
    const { bars, dropped } = toValidBars(cands, pair, tf.id);
    if (bars.length === 0) {
      return error(
        `[MALFORMED] ${pair} ${tf.id}: all ${dropped} returned bar(s) were invalid (non-finite OHLC). ` +
        `Remedy: inspect the raw feed response for the pair/timeframe.`,
      );
    }
    return {
      entry: { ...base, bars, error: null },
      ok: true,
      skipped: false,
      reason: dropped > 0 ? `${dropped} malformed bar(s) dropped` : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // surface the [DEP]/[NET] message verbatim — the remedy rides with it.
    return error(msg.startsWith('[') ? msg : `[FETCH] ${pair} ${tf.id}: ${msg}. ${NET_REMEDY}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ARGS
// ═══════════════════════════════════════════════════════════════════════════

interface CliOptions {
  dryRun: boolean;
  outPath: string;
  pairFilter: Set<string> | null;
  brokerOverrides: Record<string, string>; // e.g. { 'AUD/USD': 'OANDA' }
  ignored: string[];
}

/** The default output path — the tmpdir/opencode/bars_raw.json convention
 *  (the /tmp/opencode/bars_raw.json fixture path, derived — never a hardcoded
 *  machine-specific literal; the --out flag overrides). */
const DEFAULT_OUT = join(tmpdir(), 'opencode', 'bars_raw.json');

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    dryRun: false,
    outPath: DEFAULT_OUT,
    pairFilter: null,
    brokerOverrides: {},
    ignored: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--dry-run' || a === '--dryrun') {
      opts.dryRun = true;
    } else if (a.startsWith('--out=')) {
      opts.outPath = a.slice('--out='.length) || DEFAULT_OUT;
    } else if (a === '--out') {
      opts.outPath = argv[i + 1] ?? DEFAULT_OUT;
      i++;
    } else if (a.startsWith('--pairs=')) {
      opts.pairFilter = new Set(
        a.slice('--pairs='.length).split(',').map((s) => s.trim()).filter(Boolean),
      );
    } else if (a.startsWith('--broker=')) {
      const kv = a.slice('--broker='.length).split(':');
      const pair = (kv[0] ?? '').trim();
      const broker = (kv[1] ?? '').trim().toUpperCase();
      if (pair && broker) opts.brokerOverrides[pair] = broker;
    } else {
      opts.ignored.push(a);
    }
  }
  return opts;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE RUN — main() returns the exit code (0 = at least one pair fetched;
// the file is written ONLY on a successful fetch of at least one pair).
// ═══════════════════════════════════════════════════════════════════════════

function effectiveBroker(pair: string, overrides: Record<string, string>): string {
  return overrides[pair] ?? BROKER_MAP[pair] ?? 'PROPOSED';
}

function printMatrix(opts: CliOptions): void {
  const pairs = (opts.pairFilter ? PAIRS.filter((p) => opts.pairFilter!.has(p)) : PAIRS);
  console.log('FETCH MATRIX (--dry-run — NO network, NO library required)');
  console.log('---');
  for (const pair of pairs) {
    const broker = effectiveBroker(pair, opts.brokerOverrides);
    const exchange = exchangeFor(pair);
    const gate = broker === 'PROPOSED' ? '  [GATED: requires --broker override]' : '';
    console.log(`${pair}  broker=${broker}  exchange=${exchange || '(none)'}${gate}`);
    for (const tf of TIMEFRAMES) {
      const marker = broker === 'PROPOSED' ? '  SKIP (PROPOSED)' : '  fetch';
      console.log(`    ${tf.id.padEnd(4)} n_bars=${String(tf.nBars).padEnd(4)} interval=${tf.interval.padEnd(3)} ~${String(tf.spanDays).padStart(2)}d${marker}`);
    }
  }
  console.log('---');
  console.log('OUT  : ' + opts.outPath);
  console.log('REMEDY (live run): install the feed first — bun add tvdatafeed');
}

async function main(): Promise<number> {
  const opts = parseArgs(process.argv.slice(2));
  for (const flag of opts.ignored) {
    console.error(`[ARGS] unknown flag ignored: '${flag}'`);
  }
  for (const [pair, broker] of Object.entries(opts.brokerOverrides)) {
    if (!PAIRS.includes(pair)) {
      console.error(`[ARGS] --broker override for unknown pair '${pair}' ignored (valid: ${PAIRS.join(', ')})`);
      delete opts.brokerOverrides[pair];
    }
  }

  if (opts.dryRun) {
    printMatrix(opts);
    return 0;
  }

  const pairs = opts.pairFilter ? PAIRS.filter((p) => opts.pairFilter!.has(p)) : PAIRS;
  const entries: RawFeed[] = [];
  let okCells = 0;
  let failCells = 0;
  let skipCells = 0;

  for (const pair of pairs) {
    const broker = effectiveBroker(pair, opts.brokerOverrides);
    for (const tf of TIMEFRAMES) {
      const cell = await fetchCell(pair, tf, broker);
      entries.push(cell.entry);
      if (cell.skipped) {
        skipCells++;
        console.error(`[BROKER] ${pair} ${tf.id}: ${cell.entry.error}`);
      } else if (cell.ok) {
        okCells++;
        const n = cell.entry.bars.length;
        const extra = cell.reason ? ` (${cell.reason})` : '';
        console.log(`[FETCH] ${pair} ${tf.id}  ${broker}/${exchangeFor(pair)}  OK  ${n} bars${extra}`);
      } else {
        failCells++;
        console.error(`[FETCH] ${pair} ${tf.id}  FAIL  ${cell.entry.error}`);
      }
    }
  }

  // the summary — honest, always.
  const total = pairs.length * TIMEFRAMES.length;
  console.log('---');
  console.log(`[SUMMARY] cells=${total} ok=${okCells} failed=${failCells} skipped(PROPOSED)=${skipCells}`);
  if (failCells > 0) {
    console.log('[SUMMARY] the failing cells recorded their errors in RawFeed.error — see above.');
  }

  if (okCells === 0) {
    console.error(`[FETCH] FAILED: zero cells fetched (ok=${okCells}). The output file was NOT written.`);
    if (skipCells === total) {
      console.error('[FETCH] every pair is broker-PROPOSED — supply the broker override(s) first.');
    }
    return 1;
  }

  // the JSON write — only when at least one pair actually fetched.
  const out = resolve(opts.outPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`[FETCH] wrote ${entries.length} RawFeed entries to ${out}`);

  // 0 = at least one pair fetched (the file is written); the failing cells'
  // errors are recorded in the JSON + on stderr.
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    console.error('[FETCH] FATAL (uncaught): ' + (err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  });
