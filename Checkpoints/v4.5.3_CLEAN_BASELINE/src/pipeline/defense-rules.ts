/**
 * PLUTUS 4.0 Pipeline — Defense Rules
 *
 * Defense rules are ENFORCED IN CODE at the pipeline boundary. Each rule
 * has a check function that runs at a specific point and writes a
 * PipelineError on violation. The orchestrator halts on FATAL severity.
 * There is NO fallback — a FATAL is a FATAL.
 *
 * INTEGRATION: NEW FILE src/pipeline/defense-rules.ts
 * Source: L2 Spec Section 5
 */

import type { PipelineContext } from './types.js';
import type { PipelineError, PhaseResult } from './types.js';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

export type { PhaseResult };

export type DefenseSeverity = 'FATAL' | 'ERROR' | 'WARN';

export interface DefenseRule {
  id: string;
  description: string;
  severity: DefenseSeverity;
  check: (ctx: PipelineContext) => PipelineError | null;
}

export const SL_MIN_PIPS = 5;
export const SL_MAX_PIPS = 15;
export const SL_MEDIAN_PIPS = 12;
export const MIN_VALIDATED_ZONES_PER_PAIR = 3;
export const MIN_SETUPS_PER_PAIR = 8;
export const REQUIRED_CATEGORIES = ['SWING_SCALP', 'BREAKOUT_SURGE', 'WHIPLASH'] as const;

const EGRESS_LOG_PATH = process.env.PLUTUS_EGRESS_LOG ?? './reports/plutus-egress.log';
const PUSH_LOG_PATH = process.env.PLUTUS_PUSH_LOG ?? './reports/plutus-push-log.ndjson';
const pipeRequire = createRequire(import.meta.url);

function readEgressLog(since: number): { host: string; ts: number }[] {
  if (!existsSync(EGRESS_LOG_PATH)) return [];
  try {
    const content = readFileSync(EGRESS_LOG_PATH, 'utf-8');
    const entries: { host: string; ts: number }[] = [];
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.ts >= since && parsed.host) entries.push({ host: parsed.host, ts: parsed.ts });
      } catch { /* skip */ }
    }
    return entries;
  } catch { return []; }
}

function isMutterRunning(): boolean {
  try {
    execSync('pgrep -x Mutter', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    try {
      execSync('pgrep -f mutter', { encoding: 'utf-8', stdio: 'pipe' });
      return true;
    } catch { return false; }
  }
}

function listTvControllerFiles(): string[] {
  try {
    const { globSync } = require('node:fs');
    return [...globSync('src/pipeline/tv-chart-controller.ts')];
  } catch { return []; }
}

function readFileContent(p: string): string {
  try { return readFileSync(p, 'utf-8'); } catch { return ''; }
}

function isForbiddenLibInstalled(pkg: string): boolean {
  try { pipeRequire.resolve(pkg); return true; } catch { return false; }
}

function readManualStepPushLog(since: number): { stepId: string; bodySteps: string[] }[] {
  if (!existsSync(PUSH_LOG_PATH)) return [];
  try {
    const content = readFileSync(PUSH_LOG_PATH, 'utf-8');
    const entries: { stepId: string; bodySteps: string[] }[] = [];
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.ts >= since && parsed.stepId && parsed.bodySteps) entries.push(parsed);
      } catch { /* skip */ }
    }
    return entries;
  } catch { return []; }
}

function computeFridayIso(weekStartIso: string): string {
  const t = new Date(weekStartIso + 'T00:00:00Z').getTime();
  return new Date(t + 4 * 86_400_000).toISOString().slice(0, 10);
}

function computeExpectedDays(weekStartIso: string): string[] {
  const t = new Date(weekStartIso + 'T00:00:00Z').getTime();
  return [0, 1, 2, 3, 4].map((i) => new Date(t + i * 86_400_000).toISOString().slice(0, 10));
}

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-EXTERNAL-VLM
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_EXTERNAL_VLM: DefenseRule = {
  id: 'DR-NO-EXTERNAL-VLM',
  description: 'No external VLM API calls. Agent does ALL vision work directly.',
  severity: 'FATAL',
  check: (ctx) => {
    const allowed = ['tradingview.com', 'investinglive.com'];
    const egress = readEgressLog(ctx.startedAt);
    const violations = egress.filter((e) => !allowed.some((a) => e.host.endsWith(a)));
    if (violations.length > 0) {
      return { stage: 'plutus-pipeline-charts', pair: 'ALL', severity: 'FATAL',
        message: `External egress detected (not in allowlist): ${violations.map((v) => v.host).join(', ')}`,
        context: { violations }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-FORWARD-CHEATING
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_FORWARD_CHEATING: DefenseRule = {
  id: 'DR-NO-FORWARD-CHEATING',
  description: 'No OHLC bar with timestamp > temporalAnchor.',
  severity: 'FATAL',
  check: (ctx) => {
    const harvest = ctx.phaseResults['plutus-pipeline-harvest'];
    if (!harvest) return null;
    const ohlc = (harvest.data as { ohlc: Record<string, { timestamp: number }[]> }).ohlc;
    let leaked = 0;
    for (const [, bars] of Object.entries(ohlc)) {
      for (const b of bars) { if (b.timestamp > ctx.temporalAnchor) leaked++; }
    }
    if (leaked > 0) {
      return { stage: 'plutus-pipeline-harvest', pair: 'ALL', severity: 'FATAL',
        message: `${leaked} OHLC bars leaked past temporalAnchor`,
        context: { leaked, anchor: ctx.temporalAnchor }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-HARDCODED-DATES
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_HARDCODED_DATES: DefenseRule = {
  id: 'DR-NO-HARDCODED-DATES',
  description: 'All dates must derive from weekStart. No hardcoded date strings.',
  severity: 'FATAL',
  check: (ctx) => {
    const harvest = ctx.phaseResults['plutus-pipeline-harvest'];
    if (!harvest) return null;
    const link = (harvest.data as { optionsDateLink: { weekStartIso: string; fridayIso: string } }).optionsDateLink;
    const expectedFriday = computeFridayIso(ctx.weekStart);
    if (link.fridayIso !== expectedFriday) {
      return { stage: 'plutus-pipeline-harvest', pair: 'ALL', severity: 'FATAL',
        message: `Hardcoded or wrong date: link.fridayIso=${link.fridayIso}, expected ${expectedFriday}`,
        context: { link, expectedFriday }, timestamp: Date.now() };
    }
    if (link.weekStartIso !== ctx.weekStart) {
      return { stage: 'plutus-pipeline-harvest', pair: 'ALL', severity: 'FATAL',
        message: `link.weekStartIso (${link.weekStartIso}) != ctx.weekStart (${ctx.weekStart})`,
        context: { link, ctxWeekStart: ctx.weekStart }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-MONOLITH
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_MONOLITH: DefenseRule = {
  id: 'DR-NO-MONOLITH',
  description: 'Pipeline must call harvest -> zones -> shapes -> charts -> setups (all 5, in order).',
  severity: 'FATAL',
  check: (ctx) => {
    const expected = ['plutus-pipeline-harvest','plutus-pipeline-zones','plutus-pipeline-shapes','plutus-pipeline-charts','plutus-pipeline-setups'] as const;
    const actual = Object.keys(ctx.phaseResults);
    for (let i = 0; i < expected.length; i++) {
      if (actual[i] !== expected[i]) {
        return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'FATAL',
          message: `Pipeline order broken: expected ${expected[i]} at index ${i}, got ${actual[i] ?? 'MISSING'}`,
          context: { expected, actual }, timestamp: Date.now() };
      }
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-SKIPPED-MANUAL-STEPS
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_SKIPPED_MANUAL_STEPS: DefenseRule = {
  id: 'DR-NO-SKIPPED-MANUAL-STEPS',
  description: 'All 4 manual steps (A, B, C, D) must produce validated output.',
  severity: 'FATAL',
  check: (ctx) => {
    const missing: string[] = [];
    for (const step of ['A', 'B', 'C', 'D'] as const) {
      if (!ctx.manualStepOutputs[step]) missing.push(step);
    }
    if (missing.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'FATAL',
        message: `Manual steps skipped: ${missing.join(', ')}`,
        context: { missing, missCounts: ctx.manualStepMissCount }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-BROWSER-AUTOMATION-LIBS
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_BROWSER_AUTOMATION_LIBS: DefenseRule = {
  id: 'DR-NO-BROWSER-AUTOMATION-LIBS',
  description: 'No Puppeteer, browser-use, playwright, or similar CDP-abstraction libraries.',
  severity: 'FATAL',
  check: (_ctx) => {
    const forbidden = ['puppeteer', 'puppeteer-core', 'playwright', 'playwright-core', 'browser-use'];
    for (const pkg of forbidden) {
      if (isForbiddenLibInstalled(pkg)) {
        return { stage: 'plutus-pipeline-charts', pair: 'ALL', severity: 'FATAL',
          message: `Forbidden browser automation library installed: ${pkg}`,
          context: { pkg }, timestamp: Date.now() };
      }
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-XWAYLAND-DISPLAY-1
// ═══════════════════════════════════════════════════════════════════════════
export const DR_XWAYLAND_DISPLAY_1: DefenseRule = {
  id: 'DR-XWAYLAND-DISPLAY-1',
  description: 'XWayland :1 with Mutter compositor must be active for GUI draw tools.',
  severity: 'FATAL',
  check: (_ctx) => {
    if (process.env.DISPLAY !== ':1') {
      return { stage: 'plutus-pipeline-charts', pair: 'ALL', severity: 'FATAL',
        message: `DISPLAY=${process.env.DISPLAY ?? 'unset'}, expected ':1'`,
        context: { display: process.env.DISPLAY }, timestamp: Date.now() };
    }
    if (!isMutterRunning()) {
      return { stage: 'plutus-pipeline-charts', pair: 'ALL', severity: 'FATAL',
        message: 'Mutter compositor not running. Pointer events will not propagate.',
        context: {}, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-JS-CHART-API
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_JS_CHART_API_BUILD: DefenseRule = {
  id: 'DR-NO-JS-CHART-API',
  description: 'TvChartController must use only Input.dispatchMouseEvent, not JS chart API.',
  severity: 'FATAL',
  check: (_ctx) => {
    const forbiddenPatterns = ['createShape', 'createMultipointShape', 'createEntityId', '.chart().', '.tvChart().'];
    const sourceFiles = listTvControllerFiles();
    for (const file of sourceFiles) {
      const src = readFileContent(file);
      for (const pat of forbiddenPatterns) {
        if (src.includes(pat)) {
          return { stage: 'plutus-pipeline-charts', pair: 'ALL', severity: 'FATAL',
            message: `Forbidden JS chart API pattern '${pat}' in ${file}`,
            context: { file, pattern: pat }, timestamp: Date.now() };
        }
      }
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-GENERIC-VLM-PROMPTS
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_GENERIC_VLM_PROMPTS: DefenseRule = {
  id: 'DR-NO-GENERIC-VLM-PROMPTS',
  description: 'Manual Step D push must inject Plutus identity + 37 laws + zone methodology.',
  severity: 'FATAL',
  check: (ctx) => {
    const chartsResult = ctx.phaseResults['plutus-pipeline-charts'];
    if (!chartsResult) return null;
    const pushLog = readManualStepPushLog(ctx.startedAt);
    const stepDPush = pushLog.find((p) => p.stepId === 'D');
    if (!stepDPush) {
      return { stage: 'manual-step-D', pair: 'ALL', severity: 'FATAL',
        message: 'Manual Step D push not recorded', context: {}, timestamp: Date.now() };
    }
    const required = ['PLUTUS', '37 trading laws', 'zone identification methodology'];
    const joined = stepDPush.bodySteps.join(' ');
    const missing = required.filter((r) => !joined.includes(r));
    if (missing.length > 0) {
      return { stage: 'manual-step-D', pair: 'ALL', severity: 'FATAL',
        message: `Manual Step D push missing identity markers: ${missing.join(', ')}`,
        context: { missing, push: stepDPush }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-NO-DATA-DRIVEN-VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
export const DR_NO_DATA_DRIVEN_VALIDATION: DefenseRule = {
  id: 'DR-NO-DATA-DRIVEN-VALIDATION',
  description: 'All setups must be source=VISUAL with zoneRef matching a validated VisualSDZone.',
  severity: 'FATAL',
  check: (ctx) => {
    const setupsResult = ctx.phaseResults['plutus-pipeline-setups'];
    if (!setupsResult) return null;
    const setups = (setupsResult.data as { setups: { source: string; zoneRef: string }[] }).setups;
    const fallback = setups.filter((s) => s.source !== 'VISUAL');
    if (fallback.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'FATAL',
        message: `${fallback.length} setups have source != VISUAL (DATA-FALLBACK forbidden by T6)`,
        context: { fallbackCount: fallback.length, fallbackSources: fallback.map((s) => s.source) }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-MIN-VALIDATED-ZONES-PER-PAIR
// ═══════════════════════════════════════════════════════════════════════════
export const DR_MIN_VALIDATED_ZONES_PER_PAIR: DefenseRule = {
  id: 'DR-MIN-VALIDATED-ZONES-PER-PAIR',
  description: `Each pair must have >=${MIN_VALIDATED_ZONES_PER_PAIR} VLM-validated zones (T17).`,
  severity: 'FATAL',
  check: (ctx) => {
    const counts: Record<string, number> = {};
    for (const v of ctx.validatedZones) {
      if (v.source === 'VLM_REJECTED') continue;
      counts[v.pair] = (counts[v.pair] ?? 0) + 1;
    }
    const deficient = ctx.pairList.filter((p) => (counts[p] ?? 0) < MIN_VALIDATED_ZONES_PER_PAIR);
    if (deficient.length > 0) {
      return { stage: 'manual-step-D', pair: deficient[0], severity: 'FATAL',
        message: `Pairs with <${MIN_VALIDATED_ZONES_PER_PAIR} validated zones: ${deficient.join(', ')}`,
        context: { counts, minimum: MIN_VALIDATED_ZONES_PER_PAIR }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-MIN-SETUPS-PER-PAIR
// ═══════════════════════════════════════════════════════════════════════════
export const DR_MIN_SETUPS_PER_PAIR: DefenseRule = {
  id: 'DR-MIN-SETUPS-PER-PAIR',
  description: `Each pair must produce >=${MIN_SETUPS_PER_PAIR} setups (T1-T4).`,
  severity: 'FATAL',
  check: (ctx) => {
    const setupsResult = ctx.phaseResults['plutus-pipeline-setups'];
    if (!setupsResult) return null;
    const setups = (setupsResult.data as { setups: { pair: string }[] }).setups;
    const counts: Record<string, number> = {};
    for (const s of setups) counts[s.pair] = (counts[s.pair] ?? 0) + 1;
    const deficient = ctx.pairList.filter((p) => (counts[p] ?? 0) < MIN_SETUPS_PER_PAIR);
    if (deficient.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: deficient[0], severity: 'FATAL',
        message: `Pairs with <${MIN_SETUPS_PER_PAIR} setups: ${deficient.map((p) => `${p}=${counts[p] ?? 0}`).join(', ')}`,
        context: { counts, minimum: MIN_SETUPS_PER_PAIR }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-SETUP-CATEGORY-DIVERSITY
// ═══════════════════════════════════════════════════════════════════════════
export const DR_SETUP_CATEGORY_DIVERSITY: DefenseRule = {
  id: 'DR-SETUP-CATEGORY-DIVERSITY',
  description: `Setups must include >=1 of each: ${REQUIRED_CATEGORIES.join(', ')}`,
  severity: 'ERROR',
  check: (ctx) => {
    const setupsResult = ctx.phaseResults['plutus-pipeline-setups'];
    if (!setupsResult) return null;
    const cats = new Set((setupsResult.data as { setups: { category: string }[] }).setups.map((s) => s.category));
    const missing = REQUIRED_CATEGORIES.filter((c) => !cats.has(c));
    if (missing.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'ERROR',
        message: `Missing required setup categories: ${missing.join(', ')}`,
        context: { missing, present: Array.from(cats) }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-SETUP-DAY-COVERAGE
// ═══════════════════════════════════════════════════════════════════════════
export const DR_SETUP_DAY_COVERAGE: DefenseRule = {
  id: 'DR-SETUP-DAY-COVERAGE',
  description: 'Setups must span all 5 weekdays (Mon-Fri).',
  severity: 'ERROR',
  check: (ctx) => {
    const setupsResult = ctx.phaseResults['plutus-pipeline-setups'];
    if (!setupsResult) return null;
    const days = new Set((setupsResult.data as { setups: { day: string }[] }).setups.map((s) => s.day.slice(0, 10)));
    const expected = computeExpectedDays(ctx.weekStart);
    const missing = expected.filter((d) => !days.has(d));
    if (missing.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'ERROR',
        message: `Missing setups on days: ${missing.join(', ')}`,
        context: { missing, present: Array.from(days), expected }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-SL-RANGE
// ═══════════════════════════════════════════════════════════════════════════
export const DR_SL_RANGE: DefenseRule = {
  id: 'DR-SL-RANGE',
  description: `All setup SL distances must be ${SL_MIN_PIPS}-${SL_MAX_PIPS} pips (median ${SL_MEDIAN_PIPS}).`,
  severity: 'ERROR',
  check: (ctx) => {
    const setupsResult = ctx.phaseResults['plutus-pipeline-setups'];
    if (!setupsResult) return null;
    const setups = (setupsResult.data as { setups: { pair: string; entries: { front: number; mid: number; back: number }; sl: number }[] }).setups;
    const pipValues: Record<string, number> = { 'DXY': 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001, 'AUD/USD': 0.0001 };
    const distances: number[] = [];
    const violators: { pair: string; pips: number }[] = [];
    for (const s of setups) {
      const entry = (s.entries.front + s.entries.mid + s.entries.back) / 3;
      const pips = Math.abs(entry - s.sl) / pipValues[s.pair];
      distances.push(pips);
      if (pips < SL_MIN_PIPS || pips > SL_MAX_PIPS) violators.push({ pair: s.pair, pips });
    }
    if (violators.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: violators[0].pair, severity: 'ERROR',
        message: `${violators.length} setups have SL outside ${SL_MIN_PIPS}-${SL_MAX_PIPS} pip range`,
        context: { violators: violators.slice(0, 5) }, timestamp: Date.now() };
    }
    distances.sort((a, b) => a - b);
    const median = distances[Math.floor(distances.length / 2)] ?? 0;
    if (Math.abs(median - SL_MEDIAN_PIPS) > 3) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'WARN',
        message: `SL median drifted: ${median.toFixed(1)} pips (expected ~${SL_MEDIAN_PIPS})`,
        context: { median, expected: SL_MEDIAN_PIPS }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-TP-LIQUIDITY-OVERLAP
// ═══════════════════════════════════════════════════════════════════════════
export const DR_TP_LIQUIDITY_OVERLAP: DefenseRule = {
  id: 'DR-TP-LIQUIDITY-OVERLAP',
  description: 'TP must overlap an opposing S/D zone AND a LIQUIDITY zone (Earth+Fire).',
  severity: 'ERROR',
  check: (ctx) => {
    const setupsResult = ctx.phaseResults['plutus-pipeline-setups'];
    if (!setupsResult) return null;
    const setups = (setupsResult.data as { setups: { pair: string; direction: string; tp: number }[] }).setups;
    const zonesByPair: Record<string, typeof ctx.validatedZones> = {};
    for (const v of ctx.validatedZones) { (zonesByPair[v.pair] ??= []).push(v); }
    const violators: { pair: string; tp: number; reason: string }[] = [];
    for (const s of setups) {
      const zones = zonesByPair[s.pair] ?? [];
      const opposingType = s.direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
      const hasOpposingSD = zones.some((z) => z.type === opposingType && s.tp >= z.bottom && s.tp <= z.top);
      const hasLiquidity = zones.some((z) => z.type === 'LIQUIDITY' && Math.abs((z.top + z.bottom) / 2 - s.tp) < 0.002 * s.tp);
      if (!hasOpposingSD) violators.push({ pair: s.pair, tp: s.tp, reason: `no opposing ${opposingType} zone overlap` });
      else if (!hasLiquidity) violators.push({ pair: s.pair, tp: s.tp, reason: 'no LIQUIDITY zone overlap' });
    }
    if (violators.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: violators[0].pair, severity: 'ERROR',
        message: `${violators.length} setups have TP without Earth+Fire overlap`,
        context: { violators: violators.slice(0, 5) }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-SESSION-ENFORCEMENT-TEXT
// ═══════════════════════════════════════════════════════════════════════════
export const DR_SESSION_ENFORCEMENT_TEXT: DefenseRule = {
  id: 'DR-SESSION-ENFORCEMENT-TEXT',
  description: 'Every setup must have a SessionWindow value AND mention the session in notes.',
  severity: 'ERROR',
  check: (ctx) => {
    const setupsResult = ctx.phaseResults['plutus-pipeline-setups'];
    if (!setupsResult) return null;
    const setups = (setupsResult.data as { setups: { session: string; notes?: string }[] }).setups;
    const violators = setups.filter((s) => !s.session || !s.notes?.includes(s.session));
    if (violators.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'ERROR',
        message: `${violators.length} setups missing session enforcement text`,
        context: { count: violators.length }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-CANDLE-CONFIRMATION-TEXT
// ═══════════════════════════════════════════════════════════════════════════
export const DR_CANDLE_CONFIRMATION_TEXT: DefenseRule = {
  id: 'DR-CANDLE-CONFIRMATION-TEXT',
  description: 'Every setup must have non-empty candleConfirmation text describing the trigger candle.',
  severity: 'ERROR',
  check: (ctx) => {
    const setupsResult = ctx.phaseResults['plutus-pipeline-setups'];
    if (!setupsResult) return null;
    const setups = (setupsResult.data as { setups: { candleConfirmation: string }[] }).setups;
    const violators = setups.filter((s) => !s.candleConfirmation || s.candleConfirmation.trim().length < 10);
    if (violators.length > 0) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'ERROR',
        message: `${violators.length} setups missing candleConfirmation text (<10 chars)`,
        context: { count: violators.length }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-OPTIONS-STRIKES-EXTRACTED
// ═══════════════════════════════════════════════════════════════════════════
export const DR_OPTIONS_STRIKES_EXTRACTED: DefenseRule = {
  id: 'DR-OPTIONS-STRIKES-EXTRACTED',
  description: 'Manual Step A must extract >0 options strikes.',
  severity: 'FATAL',
  check: (ctx) => {
    const stepA = ctx.manualStepOutputs.A as { strikes?: unknown[] } | undefined;
    if (!stepA || !stepA.strikes || stepA.strikes.length === 0) {
      return { stage: 'manual-step-A', pair: 'ALL', severity: 'FATAL',
        message: 'No options strikes extracted (Manual Step A produced empty strikes[])',
        context: { strikeCount: stepA?.strikes?.length ?? 0 }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-ZERO-FATAL-ERRORS
// ═══════════════════════════════════════════════════════════════════════════
export const DR_ZERO_FATAL_ERRORS: DefenseRule = {
  id: 'DR-ZERO-FATAL-ERRORS',
  description: 'Pipeline must produce 0 FATAL errors (T13).',
  severity: 'FATAL',
  check: (ctx) => {
    const fatalCount = ctx.errors.filter((e) => e.severity === 'FATAL').length;
    if (fatalCount > 0) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'FATAL',
        message: `${fatalCount} FATAL errors recorded — T13 violated`,
        context: { fatalCount, errors: ctx.errors.filter((e) => e.severity === 'FATAL') }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-PIPELINE-WITHIN-5-MIN
// ═══════════════════════════════════════════════════════════════════════════
export const DR_PIPELINE_WITHIN_5_MIN: DefenseRule = {
  id: 'DR-PIPELINE-WITHIN-5-MIN',
  description: 'Pipeline must complete within 300_000ms (T14).',
  severity: 'ERROR',
  check: (ctx) => {
    const elapsed = Date.now() - ctx.startedAt;
    if (elapsed > 300_000) {
      return { stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'ERROR',
        message: `Pipeline took ${elapsed}ms (>300_000ms T14 limit)`,
        context: { elapsed }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-TV-CONTROLLER-CONNECTED
// ═══════════════════════════════════════════════════════════════════════════
export const DR_TV_CONTROLLER_CONNECTED: DefenseRule = {
  id: 'DR-TV-CONTROLLER-CONNECTED',
  description: 'TvChartController must connect successfully (T15).',
  severity: 'FATAL',
  check: (ctx) => {
    const chartsResult = ctx.phaseResults['plutus-pipeline-charts'];
    if (!chartsResult) return null;
    const fatalConnect = chartsResult.errors.find((e) => e.message.includes('TvChartController connect failed'));
    if (fatalConnect) {
      return { stage: 'plutus-pipeline-charts', pair: 'ALL', severity: 'FATAL',
        message: 'TvChartController failed to connect (CDP timeout)',
        context: { originalError: fatalConnect.message }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DR-GUI-DRAW-VISIBLE
// ═══════════════════════════════════════════════════════════════════════════
export const DR_GUI_DRAW_VISIBLE: DefenseRule = {
  id: 'DR-GUI-DRAW-VISIBLE',
  description: 'GUI draw tools must produce >=1 visible zone (T16).',
  severity: 'FATAL',
  check: (ctx) => {
    const chartsResult = ctx.phaseResults['plutus-pipeline-charts'];
    if (!chartsResult) return null;
    const drawn = (chartsResult.data as { drawnZoneCount?: number }).drawnZoneCount ?? 0;
    if (drawn === 0) {
      return { stage: 'plutus-pipeline-charts', pair: 'ALL', severity: 'FATAL',
        message: 'No zones drawn via GUI (drawnZoneCount=0)',
        context: { drawnZoneCount: drawn }, timestamp: Date.now() };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFENSE RULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
export const DEFENSE_RULES: DefenseRule[] = [
  DR_NO_FORWARD_CHEATING, DR_NO_HARDCODED_DATES, DR_NO_MONOLITH,
  DR_NO_SKIPPED_MANUAL_STEPS, DR_NO_BROWSER_AUTOMATION_LIBS,
  DR_XWAYLAND_DISPLAY_1, DR_NO_JS_CHART_API_BUILD,
  DR_TV_CONTROLLER_CONNECTED, DR_GUI_DRAW_VISIBLE,
  DR_OPTIONS_STRIKES_EXTRACTED, DR_MIN_VALIDATED_ZONES_PER_PAIR,
  DR_MIN_SETUPS_PER_PAIR, DR_NO_DATA_DRIVEN_VALIDATION,
  DR_NO_EXTERNAL_VLM, DR_NO_GENERIC_VLM_PROMPTS,
  DR_SL_RANGE, DR_TP_LIQUIDITY_OVERLAP,
  DR_SESSION_ENFORCEMENT_TEXT, DR_CANDLE_CONFIRMATION_TEXT,
  DR_SETUP_CATEGORY_DIVERSITY, DR_SETUP_DAY_COVERAGE,
  DR_PIPELINE_WITHIN_5_MIN, DR_ZERO_FATAL_ERRORS,
];

export function runDefenseRules(ctx: PipelineContext): PipelineError[] {
  const collected: PipelineError[] = [];
  for (const rule of DEFENSE_RULES) {
    try {
      const err = rule.check(ctx);
      if (err) collected.push(err);
    } catch (e) {
      collected.push({ stage: 'plutus-pipeline-setups', pair: 'ALL', severity: 'FATAL',
        message: `Defense rule ${rule.id} threw: ${(e as Error).message}`,
        context: { rule: rule.id, stack: (e as Error).stack }, timestamp: Date.now() });
    }
  }
  return collected;
}
