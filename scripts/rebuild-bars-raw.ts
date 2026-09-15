#!/usr/bin/env bun
/**
 * Rebuild /tmp/opencode/bars_raw.json from REAL on-disk CSVs.
 *
 * 4H  ← Plutus_Vibe_Agent  weeks/2026-07-06/4H/{DXY,EURUSD,GBPUSD}.csv
 * 1H  ← Plutus_Air_Agent   weeks/2026-07-06/1H/{DXY,EURUSD,GBPUSD}.csv
 * 30m/15m ← documented GAP (empty bars + error). NEVER aggregate 1H→4H/30m.
 *
 * Clip: every written bar.timestamp <= ANALYSIS_POINT_MS (1783317600000).
 * Future rows in the CSV are dropped at ingest (decision snapshot), not forged.
 *
 * Usage:
 *   bun scripts/rebuild-bars-raw.ts
 *   bun scripts/rebuild-bars-raw.ts --out=/path/bars_raw.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const ANALYSIS_POINT_MS = 1_783_317_600_000; // 2026-07-06T06:00:00Z

const VIBE_4H =
  "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Vibe_Agent/fixtures/weeks/2026-07-06/4H";
const AIR_1H =
  "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Air_Agent/fixtures/weeks/2026-07-06/1H";

const PAIRS: Array<{ csv: string; pair: string }> = [
  { csv: "DXY.csv", pair: "DXY" },
  { csv: "EURUSD.csv", pair: "EUR/USD" },
  { csv: "GBPUSD.csv", pair: "GBP/USD" },
];

export interface RawBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RawFeed {
  pair: string;
  timeframe: string;
  bars: RawBar[];
  error: string | null;
}

const GAP =
  "GAP: no surviving decision-window 30m/15m on disk for 2026-07-06. NEVER aggregate 1H→4H or 1H→30m (forged closes).";

function parseUtcMs(tradeDate: string): number {
  const iso = tradeDate.includes("T")
    ? tradeDate.replace("Z", "+00:00")
    : tradeDate.replace(" ", "T") + "Z";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error(`unparseable trade_date: ${tradeDate}`);
  return ms;
}

export function parseCsvClipped(path: string, anchorMs: number): { kept: RawBar[]; droppedFuture: number } {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error(`empty csv: ${path}`);
  const header = lines[0]!.toLowerCase();
  if (!header.includes("trade_date") || !header.includes("open")) {
    throw new Error(`unexpected header in ${path}: ${lines[0]}`);
  }
  const kept: RawBar[] = [];
  let droppedFuture = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    if (cols.length < 6) throw new Error(`malformed row ${i} in ${path}`);
    const timestamp = parseUtcMs(cols[0]!.trim());
    const open = Number(cols[1]);
    const high = Number(cols[2]);
    const low = Number(cols[3]);
    const close = Number(cols[4]);
    const volume = Number(cols[5] || 0);
    if (![open, high, low, close, timestamp].every(Number.isFinite)) {
      throw new Error(`non-finite OHLC row ${i} in ${path}`);
    }
    if (timestamp > anchorMs) {
      droppedFuture++;
      continue;
    }
    kept.push({ timestamp, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 });
  }
  kept.sort((a, b) => a.timestamp - b.timestamp);
  return { kept, droppedFuture };
}

export function buildFeeds(anchorMs = ANALYSIS_POINT_MS): RawFeed[] {
  const feeds: RawFeed[] = [];
  for (const { csv, pair } of PAIRS) {
    const h1 = parseCsvClipped(join(AIR_1H, csv), anchorMs);
    const h4 = parseCsvClipped(join(VIBE_4H, csv), anchorMs);
    feeds.push({ pair, timeframe: "1H", bars: h1.kept, error: null });
    feeds.push({ pair, timeframe: "4H", bars: h4.kept, error: null });
    feeds.push({ pair, timeframe: "30m", bars: [], error: GAP });
    feeds.push({ pair, timeframe: "15m", bars: [], error: GAP });
  }
  feeds.sort((a, b) => (a.pair + a.timeframe).localeCompare(b.pair + b.timeframe));
  return feeds;
}

export function assertNoForgedTf(feeds: RawFeed[]): void {
  for (const f of feeds) {
    if ((f.timeframe === "30m" || f.timeframe === "15m") && f.bars.length > 0) {
      throw new Error(`forged ${f.timeframe} bars for ${f.pair}: ${f.bars.length}`);
    }
    for (const b of f.bars) {
      if (b.timestamp > ANALYSIS_POINT_MS) {
        throw new Error(`future bar leaked into feed ${f.pair} ${f.timeframe} t=${b.timestamp}`);
      }
    }
  }
}

function defaultOut(): string {
  return join("/tmp", "opencode", "bars_raw.json");
}

function parseOut(argv: string[]): string {
  const flag = argv.find((a) => a.startsWith("--out="));
  return flag ? flag.slice("--out=".length) : defaultOut();
}

export function writeBarsRaw(outPath: string, feeds: RawFeed[]): void {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(feeds));
}

if (import.meta.main) {
  const out = parseOut(process.argv.slice(2));
  const feeds = buildFeeds();
  assertNoForgedTf(feeds);
  writeBarsRaw(out, feeds);
  const maxT = Math.max(0, ...feeds.flatMap((f) => f.bars.map((b) => b.timestamp)));
  const n = feeds.reduce((s, f) => s + f.bars.length, 0);
  console.log(
    JSON.stringify({
      out,
      feeds: feeds.length,
      bars: n,
      maxTimestamp: maxT,
      maxIso: new Date(maxT).toISOString(),
      anchorMs: ANALYSIS_POINT_MS,
      gap30m15m: true,
    }),
  );
}
