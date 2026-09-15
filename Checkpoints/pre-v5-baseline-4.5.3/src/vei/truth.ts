/**
 * VEI v4.4.0 — truth.ts — the truth layer (spec §5.2).
 *
 * The ground-truth store: everything VEI KNOWS about the environment —
 * view-state, the affine price↔Y cache, action outcomes, the temporal anchor.
 *
 * Determinism law (§5.2): every function here is pure. Same inputs → same
 * outputs, byte-identical. No clocks. No invented truth (§12 law 3): an
 * uncalibrated cache returns null, a missing view-state yields outcome
 * 'unknown', a missing anchor makes anchor checks inert.
 */

import { createHash } from 'node:crypto';
import { buildTemporalAnchor } from '../pipeline/temporal-anchor.js';

/** BECAUSE LD.js L52-69 (D3): oscillation detection compares the last 6 view hashes. */
export const VIEW_HISTORY_WINDOW = 6;

/** BECAUSE §6.2: two (price,y) samples define the affine line y = a·price + b. */
export const AFFINE_MIN_SAMPLES = 2;

/** BECAUSE §6.2: with ≥3 samples VEI computes residuals and reports quality. */
export const AFFINE_QUALITY_SAMPLES = 3;

/** BECAUSE §6.2: maxResidual ≤ 2px → calibrated; else keep sampling. */
export const AFFINE_MAX_RESIDUAL_PX = 2;

/** BECAUSE §6.1: a screenshot outcome is 'changed' only if byte-size > 1KB
 *  and hash ≠ previous (blank/truncated captures are failures, not truth). */
export const MIN_SCREENSHOT_BYTES = 1024;

/** BECAUSE spec §4.3/§9: the anchor window is [Monday 00:00 UTC, Friday 17:00 ET]
 *  — computed by the pipeline's own buildTemporalAnchor (read-only reuse). */
const DAY_MS = 86_400_000;

export interface ViewState {
  symbol: string;
  timeframe: string;
  barStartMs: number;          // left edge of visible range
  barEndMs: number;            // right edge
  priceHigh: number;
  priceLow: number;
  barSpacing: number;          // px per bar
}
export type ViewHash = string; // sha256 of the ViewState tuple

export interface AffineCache {
  a: number; b: number;        // y = a·price + b
  calibratedAt: ViewHash | null; // the view-state it was fitted in
  samples: Array<{ price: number; y: number }>;
  maxResidual: number;         // 0 until ≥3 samples (then max |pred−actual|)
  quality: 'provisional' | 'calibrated'; // 'calibrated' ⟺ ≥3 samples ∧ maxResidual ≤ 2px
}

export interface TruthLayer {
  current: ViewState | null;        // last parsed get_view
  currentHash: ViewHash | null;
  history: ViewHash[];              // last 6 (oscillation detection)
  affine: AffineCache | null;
  anchor: { weekStartMs: number; anchorMs: number; label: string } | null;
  screenshots: Array<{ path: string; bytes: number; hash: string; viewHash: ViewHash | null }>;
  /** Perception-class phase flag (§4.3): set when a screenshot or read() occurs
   *  (a screenshot that will be read for verdicts), cleared on navigation.
   *  D10 only fires during perception. */
  phase: 'perception' | 'other' | null;
}

export function createTruth(): TruthLayer {
  return {
    current: null,
    currentHash: null,
    history: [],
    affine: null,
    anchor: null,
    screenshots: [],
    phase: null,
  };
}

// ── Parsing (pure functions over tool results) ──────────────────────────────

/** Unwrap opencode/MCP result envelopes into a plain object, or null.
 *  Handles: raw object, JSON string, {output: string|object}, {content: [{text}]}. */
export function unwrapResult(result: unknown): unknown {
  let r = result;
  for (let depth = 0; depth < 3; depth++) {
    if (typeof r === 'string') {
      const s = r.trim();
      if (!s.startsWith('{') && !s.startsWith('[')) return r;
      try { r = JSON.parse(s); continue; } catch { return r; }
    }
    if (r && typeof r === 'object') {
      const o = r as Record<string, unknown>;
      if (typeof o.output === 'string' || (o.output && typeof o.output === 'object')) { r = o.output; continue; }
      if (Array.isArray(o.content)) {
        const text = (o.content as Array<Record<string, unknown>>)
          .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
          .map((c) => c.text as string)
          .join('\n');
        r = text;
        continue;
      }
    }
    return r;
  }
  return r;
}

/** Parse a tv_get_view result (§9): {visibleBarRange:{startMs,endMs},
 *  priceRange:{high,low}, timeframe, symbol, barSpacing}. Null on any missing
 *  core field — never a guess (§12 law 3). */
export function parseGetViewResult(result: unknown): ViewState | null {
  const r = unwrapResult(result);
  if (!r || typeof r !== 'object') return null;
  const o = r as Record<string, unknown>;
  const vbr = o.visibleBarRange as Record<string, unknown> | undefined;
  const pr = o.priceRange as Record<string, unknown> | undefined;
  const startMs = vbr?.startMs ?? o.barStartMs;
  const endMs = vbr?.endMs ?? o.barEndMs;
  const high = pr?.high ?? o.priceHigh;
  const low = pr?.low ?? o.priceLow;
  if (
    typeof startMs !== 'number' || typeof endMs !== 'number' ||
    typeof high !== 'number' || typeof low !== 'number'
  ) {
    return null;
  }
  return {
    symbol: typeof o.symbol === 'string' ? o.symbol : '',
    timeframe: typeof o.timeframe === 'string' ? o.timeframe : '',
    barStartMs: startMs,
    barEndMs: endMs,
    priceHigh: high,
    priceLow: low,
    barSpacing: typeof o.barSpacing === 'number' ? o.barSpacing : 0,
  };
}

export function hashViewState(v: ViewState): ViewHash {
  const tuple = [v.symbol, v.timeframe, v.barStartMs, v.barEndMs, v.priceHigh, v.priceLow, v.barSpacing].join('|');
  return createHash('sha256').update(tuple).digest('hex').slice(0, 16);
}

/** Hash an arbitrary tool-result payload (screenshot identity, §6.1:
 *  same image → same payload → same hash — deterministic at zero cost). */
export function sha256OfText(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

/** Fold a freshly parsed view-state into the truth layer: update current,
 *  append history (last 6), invalidate the affine cache on view change (§6.2). */
export function recordViewState(t: TruthLayer, v: ViewState): ViewHash {
  const h = hashViewState(v);
  t.current = v;
  t.currentHash = h;
  t.history.push(h);
  while (t.history.length > VIEW_HISTORY_WINDOW) t.history.shift();
  invalidateAffine(t, h);
  return h;
}

// ── The affine cache (§6.2 — the coordinate intelligence) ───────────────────

function refit(cache: AffineCache): void {
  const s = cache.samples;
  if (s.length < AFFINE_MIN_SAMPLES) return;
  if (s.length === 2) {
    // §6.2 exact two-point fit: a = (y₂−y₁)/(p₂−p₁), b = y₁−a·p₁.
    const [p1, p2] = [s[0], s[1]];
    const dp = p2.price - p1.price;
    if (dp === 0) return;
    cache.a = (p2.y - p1.y) / dp;
    cache.b = p1.y - cache.a * p1.price;
  } else {
    // ≥3 samples: deterministic least-squares over ALL samples, then residuals.
    const n = s.length;
    let sp = 0, sy = 0, spp = 0, spy = 0;
    for (const { price, y } of s) { sp += price; sy += y; spp += price * price; spy += price * y; }
    const denom = n * spp - sp * sp;
    if (denom === 0) return;
    cache.a = (n * spy - sp * sy) / denom;
    cache.b = (sy - cache.a * sp) / n;
  }
  if (s.length >= AFFINE_QUALITY_SAMPLES) {
    let maxR = 0;
    for (const { price, y } of s) {
      maxR = Math.max(maxR, Math.abs(cache.a * price + cache.b - y));
    }
    cache.maxResidual = maxR;
    cache.quality = maxR <= AFFINE_MAX_RESIDUAL_PX ? 'calibrated' : 'provisional';
  }
}

export function recordPriceSample(t: TruthLayer, price: number, y: number): void {
  if (!Number.isFinite(price) || !Number.isFinite(y)) return;
  // The cache key IS the view hash (§6.2): a stale mapping is impossible by
  // construction — a view change invalidates first (recordViewState).
  if (!t.affine || t.affine.calibratedAt !== t.currentHash) {
    t.affine = { a: 0, b: 0, calibratedAt: t.currentHash, samples: [], maxResidual: 0, quality: 'provisional' };
  }
  // Replace an identical-price sample (re-probe), else append.
  const existing = t.affine.samples.findIndex((s) => s.price === price);
  if (existing >= 0) t.affine.samples[existing] = { price, y };
  else t.affine.samples.push({ price, y });
  refit(t.affine);
}

/** null = uncalibrated (§12 law 3 — never a guess). Serves once ≥2 samples are
 *  fitted in the CURRENT view; the ≥3-sample residual gate sets `quality`. */
export function priceToY(t: TruthLayer, price: number): number | null {
  const c = t.affine;
  if (!c || c.samples.length < AFFINE_MIN_SAMPLES) return null;
  if (c.calibratedAt !== t.currentHash) return null;
  return Math.round(c.a * price + c.b);
}

export function invalidateAffine(t: TruthLayer, newHash: ViewHash): void {
  if (t.affine && t.affine.calibratedAt !== newHash) t.affine = null;
}

// ── Outcome computation (§6.1 — did the action do anything?) ────────────────

/**
 * Per-tool polarity (§6.1 table). `expected` comes from the profile.
 * nav-class: view-state hash delta. screenshot-class: new hash ≠ previous ∧
 * bytes > 1KB. read-class / click-class: honest 'unknown' (never a finding).
 * draw-class: 'unknown' in v1 — the drawing-list delta oracle requires a
 * list_drawings result, which VEI consumes but does not force (§6.1 note).
 */
export function computeOutcome(
  t: TruthLayer,
  tool: string,
  before: ViewHash | null,
  expected: 'view' | 'drawing' | 'screenshot' | 'none',
): 'changed' | 'unchanged' | 'unknown' {
  switch (expected) {
    case 'view': {
      if (before === null || t.currentHash === null) return 'unknown';
      return before !== t.currentHash ? 'changed' : 'unchanged';
    }
    case 'screenshot': {
      const shots = t.screenshots;
      if (shots.length === 0) return 'unknown';
      const last = shots[shots.length - 1];
      if (last.bytes <= MIN_SCREENSHOT_BYTES) return 'unchanged';
      if (shots.length >= 2 && shots[shots.length - 2].hash === last.hash) return 'unchanged';
      return 'changed';
    }
    case 'drawing':
    case 'none':
      return 'unknown';
  }
}

// ── Temporal anchor (§4.3) ──────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Jul 6-10, 2026' — deterministic from the anchor window (UTC). */
export function formatAnchorLabel(weekStartMs: number, anchorMs: number): string {
  const start = new Date(weekStartMs);
  // anchorMs is Friday 17:00 ET; the Friday DATE is anchorMs minus the 17h offset.
  const friday = new Date(anchorMs - 17 * 3_600_000);
  return `${MONTHS_SHORT[start.getUTCMonth()]} ${start.getUTCDate()}-${friday.getUTCDate()}, ${start.getUTCFullYear()}`;
}

/** From buildTemporalAnchor (§4.3) — the pipeline's own anchor math, reused
 *  read-only. Invalid input → anchor stays null (inert, §12 law 3). */
export function setAnchor(t: TruthLayer, weekStart: string): void {
  try {
    const a = buildTemporalAnchor(weekStart);
    t.anchor = {
      weekStartMs: a.weekStartMs,
      anchorMs: a.anchorMs,
      label: formatAnchorLabel(a.weekStartMs, a.anchorMs),
    };
  } catch {
    t.anchor = null;
  }
}

/** Direct-window variant (test rigs + pre-computed anchors). */
export function setAnchorWindow(t: TruthLayer, weekStartMs: number, anchorMs: number, label?: string): void {
  t.anchor = { weekStartMs, anchorMs, label: label ?? formatAnchorLabel(weekStartMs, anchorMs) };
}

/** visible ∩ target / target (§4.3, Appendix B.2): |min(ve,ae)−max(vs,as)| /
 *  (ae−as), clamped ≥ 0. null without anchor or view — inert, never guessed. */
export function anchorCoverage(t: TruthLayer): number | null {
  if (!t.anchor || !t.current) return null;
  const { weekStartMs: as, anchorMs: ae } = t.anchor;
  const { barStartMs: vs, barEndMs: ve } = t.current;
  const span = ae - as;
  if (span <= 0) return null;
  const overlap = Math.min(ve, ae) - Math.max(vs, as);
  return Math.max(0, overlap) / span;
}
