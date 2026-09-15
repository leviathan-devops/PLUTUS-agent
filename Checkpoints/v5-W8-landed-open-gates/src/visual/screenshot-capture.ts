// src/visual/screenshot-capture.ts — B.W3.5.1 step 4 (spec line 1099) + the
// card contract §8.1 visuals.charts[] (12 entries: 3 pairs x 4 TFs).
// Path math is pure (unit-tested); the live capture runs through the driver.
// Filenames carry pair_tf ONLY — no wall-clock (the determinism law S-7).

import type { TvBrowserDriver, TvPair, TvTimeframe } from "./tv-browser-adapter.ts";

export const CAPTURE_PAIRS: readonly TvPair[] = ["DXY", "EUR/USD", "GBP/USD"];
export const CAPTURE_TFS: readonly TvTimeframe[] = ["4H", "1H", "30m", "15m"];

export interface CapturedChart {
  readonly pair: TvPair;
  readonly timeframe: TvTimeframe;
  readonly path: string;
}

export class CaptureError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "CaptureError";
    this.code = code;
  }
}

function pairSlug(pair: TvPair): string {
  if (pair === "DXY") return "dxy";
  if (pair === "EUR/USD") return "eu";
  if (pair === "GBP/USD") return "gu";
  throw new CaptureError("VISUAL_BAD_PAIR", `unknown pair: ${String(pair)}`);
}

/** screenshots/{pair}_{tf}.png — the slug form matches the card §8.1 (eu_4h.png). */
export function capturePath(pair: TvPair, tf: TvTimeframe): string {
  if (!CAPTURE_PAIRS.includes(pair)) throw new CaptureError("VISUAL_BAD_PAIR", `unknown pair: ${String(pair)}`);
  if (!CAPTURE_TFS.includes(tf)) throw new CaptureError("VISUAL_BAD_TF", `unknown timeframe: ${String(tf)}`);
  return `screenshots/${pairSlug(pair)}_${tf.toLowerCase()}.png`;
}

/** The full 12-path set, pair-major in TF order 4H/1H/30m/15m. */
export function captureSet(): CapturedChart[] {
  const out: CapturedChart[] = [];
  for (const pair of CAPTURE_PAIRS) {
    for (const timeframe of CAPTURE_TFS) {
      out.push({ pair, timeframe, path: capturePath(pair, timeframe) });
    }
  }
  return out;
}

export interface CaptureResult extends CapturedChart {
  readonly navigated: unknown;
  readonly screenshotted: unknown;
}

/**
 * Live capture for one chart: navigate to pair+TF, then screenshot to path.
 * The driver performs the side effects BEFORE any success is returned.
 */
export async function capture(
  driver: TvBrowserDriver,
  pair: TvPair,
  tf: TvTimeframe,
): Promise<CaptureResult> {
  if (driver === null || typeof driver !== "object" || typeof driver.navigate !== "function" || typeof driver.screenshot !== "function") {
    throw new CaptureError("VISUAL_NO_DRIVER", "capture requires a TvBrowserDriver with navigate + screenshot");
  }
  const path = capturePath(pair, tf);
  let navigated: unknown;
  try {
    navigated = await driver.navigate({ pair, timeframe: tf });
  } catch (e) {
    throw new CaptureError("VISUAL_NAVIGATE_FAILED", `capture navigate ${pair} ${tf} failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  let screenshotted: unknown;
  try {
    screenshotted = await driver.screenshot({ path });
  } catch (e) {
    throw new CaptureError("VISUAL_CAPTURE_FAILED", `capture screenshot ${path} failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { pair, timeframe: tf, path, navigated, screenshotted };
}
