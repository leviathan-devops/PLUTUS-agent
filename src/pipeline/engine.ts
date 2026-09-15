/**
 * PLUTUS 4.0 Pipeline Engine — Bridge between the 5-tool chain spec and
 * @opencode-ai/plugin tool() definitions.
 *
 * This file creates 5 @opencode-ai/plugin tool() definitions that implement
 * the mechanical 5-tool chain: harvest → zones → shapes → charts → setups.
 *
 * Each tool calls the EXISTING engine components via their REAL APIs —
 * verified by reading the source, not assumed.
 *
 * Manual steps between tools (A/B/C/D) are enforced by the agent's
 * instruction-following: each tool's output includes explicit next-step
 * instructions. The next tool validates the manual step output in its args.
 */

import { tool } from '@opencode-ai/plugin';
import type { ToolResult } from '@opencode-ai/plugin';
import { Logger } from '../utils/logger.js';
import { buildTemporalAnchor } from './temporal-anchor.js';
import { generateCandidateLadder, formatLadderForLog, type ScaffoldRung } from '../engines/ladder-scaffold.js';
import { toPipelineError } from './errors.js';
import { buildManualStepAPush, buildManualStepBPush, buildManualStepCPush, buildManualStepDPush } from './manual-step-push.js';
import { PLUTUS_VLM_SYSTEM_PROMPT } from './vlm-prompts.js';
import { PIP_VALUE, ZoneType } from '../types.js';
import type { OHLCBar, DXYZone, ZoneMapSnapshot, TradeSetup } from '../types.js';
import type { LiquidZone } from '../brains/lqz-lobe.js';
import type { ZoneModel } from '../mdve/types.js';
import type { OptionsExpiryData } from '../clients/investinglive-client.js';
// v4.5.4 Phase 7: the STEP A/B tools + the gate tool (the agent-in-the-loop
// restoration). The context accessor is injected into each factory — NO runtime
// circular import (the tools import only the PipelineRunContext TYPE).
import { buildStepATool, type StepADesignation } from './reason-step-a.js';
import { buildStepBTool, type TokenLedger } from './reason-step-b.js';
import { buildGateTool } from './gate-tool.js';
import { assertProjectionContract, type TradeProjection } from '../mdve/reasoning-chain.js';
// s2.8 RC-1 (the W7 wave — the reasoning-chain wiring completion): the
// pipeline context's "now" is the locked London pre-market analysis point
// (the §2.1 anchor — the operator's temporal law), NEVER the Friday close.
import { getAnalysisPointMs, isAnalysisPointLocked, ANALYSIS_POINT_MS } from '../mdve/temporal.js';
import { lqzTelescopedCreatedAt, lqzTelescopedIdentity } from './lqz-telescope-id.ts';

const log = new Logger('Pipeline4Engine');
const z = tool.schema;

// ═══════════════════════════════════════════════════════════════════════════════
// SDK CLIENT BRIDGE — retained for API compatibility (set by the plugin entry
// point). Visual analysis is NOT delegated to the SDK: under the ZIP protocol
// the agent IS the VLM — it reads screenshot PNGs directly via read() and
// emits ZONE| lines (Manual Step D). The harness verifies via zip.verifyZone.
// ═══════════════════════════════════════════════════════════════════════════════

let sdkClient: any = null;

export function setSdkClient(client: any): void {
  sdkClient = client;
  log.info('SDK client bridge set (compat shim — ZIP protocol: agent reads screenshots directly)');
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL PIPELINE CONTEXT — shared across tool calls within a single run
// ═══════════════════════════════════════════════════════════════════════════════

// v4.5.4 Phase 7: the context is EXPORTED so the STEP A/B/gate tool files
// (reason-step-a.ts · reason-step-b.ts · gate-tool.ts) can type their
// injected-context APIs against it. The interface itself is extended in place
// (the spec §7.4 — the stepADesignation + reasoningLedger + projections fields).
export interface PipelineRunContext {
  weekStart: string;
  temporalAnchor: number;
  // Phase results — each tool stores its output here for the next tool to consume
  harvestData: null | {
    ohlc: Record<string, OHLCBar[]>;
    ohlcByPairTf: Record<string, Record<string, OHLCBar[]>>;
    spots: Record<string, number>;
    optionsDateLink: { indexUrl: string; dateToken: string; hrefPattern: string; label: string; weekStartIso: string; fridayIso: string };
    options: unknown[];
    calendar: unknown[];
  };
  zoneMapSnapshot: null | ZoneMapSnapshot;
  shapeSnapshot: null | import('../types.js').ShapePredictionSnapshot;
  // W6-3: per-pair zone maps + per-pair shape chains (dedicated data, dedicated
  // shape chain per pair — the operator's doctrine). shapeSnapshot above is
  // kept as the DXY chain for backward compatibility (report section 7).
  zonesByPair: null | Record<string, DXYZone[]>;
  // W7: deterministic candidate ladder per pair (the zone-consistency RC fix — NEXT_STEPS §1)
  scaffoldByPair: null | Record<string, ScaffoldRung[]>;
  shapeByPair: null | Record<string, import('../types.js').ShapePredictionSnapshot>;
  // W6-3 Phase 2: DXY macro bias extracted once from DXY's own chain,
  // injected into every FX pair's Engine 3 as inverse-direction parameter.
  dxyMacroBias: null | 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  // v4.4 MDVE+mirror stage (ADDITIVE — never gates the emergent lane):
  // per-pair pillarEngine outputs (stored by the zones tool for the MDVE
  // models), the deterministic ChartModels, and the mirror-stage summary
  // consumed by the report's Section 26.
  pillarResultByPair: null | Record<string, import('../brains/9-pillar-lobe.js').PillarResult>;
  chartModelsByPair: null | Record<string, import('../mdve/index.js').ChartModel>;
  mdveStage: null | import('./mdve-stage.js').MdveStageSummary;
  screenshots: Array<{ pair: string; timeframe: string; path: string; capturedAt: number }>;
  manualStepOutputs: Record<string, unknown>;
  validatedZones: any[];
  errors: any[];
  startedAt: number;
  setupCounter: number;
  // v4.5.4 Phase 7 (the spec §2.2/§2.3 + §7.4): the STEP A/B outputs carried
  // through the chain — stepADesignation (STEP A → the E2's input), the
  // reasoningLedger (the STEP B machine core), and the projections (STEP B's
  // output → the E3's input). The gate tool resets the context at the chain's end.
  stepADesignation: null | StepADesignation[];
  reasoningLedger: null | TokenLedger;
  projections: null | TradeProjection[];
  // s2.8 RC-1 (the W7 wave): the London pre-market analysis point — the
  // §2.1 anchor ("today" = the locked ANALYSIS_POINT_MS, NEVER the Friday
  // close). temporalAnchor is the run's "now" (the §2.1 semantics), the
  // analysisPointMs is the explicit London pre-market point — the same value
  // (the spec §2.8's context carries both names for the consuming lanes).
  analysisPointMs: number;
  // s2.8 RC-6 (the W7 wave — the frozen-snapshot): the "close the charts"
  // clause. The setups tool sets placed = true AFTER the projections resolve;
  // any E2 (shapes) / E3 (setups) re-entry throws FROZEN_SNAPSHOT — the
  // pipeline NEVER recomputes post-order (the operator's workflow).
  placed: boolean;
}

let currentRun: PipelineRunContext | null = null;

function ensureContext(weekStart: string): PipelineRunContext {
  if (!currentRun || currentRun.weekStart !== weekStart) {
    const anchor = buildTemporalAnchor(weekStart);
    // s2.8 RC-1 (the W7 wave — the harness re-anchor): the run's "now" is the
    // London pre-market analysis point, NEVER the Friday close (the §2.1
    // temporal law — the Friday close 1783702800000 leaks the week's answers).
    // The temporal engine's locked value is authoritative when the pipeline
    // entry locked it; when UNLOCKED (the diag/legacy paths that never lock)
    // the ANALYSIS_POINT_MS constant is the anchor — the same inert-when-
    // unlocked philosophy as gateBars (never a throw in the test paths).
    const analysisPointMs = isAnalysisPointLocked() ? getAnalysisPointMs() : ANALYSIS_POINT_MS;
    currentRun = {
      weekStart,
      temporalAnchor: analysisPointMs,
      analysisPointMs,
      harvestData: null,
      zoneMapSnapshot: null,
      shapeSnapshot: null,
      zonesByPair: null,
      scaffoldByPair: null,
      shapeByPair: null,
      dxyMacroBias: null,
      pillarResultByPair: null,
      chartModelsByPair: null,
      mdveStage: null,
      screenshots: [],
      manualStepOutputs: {},
      validatedZones: [],
      errors: [],
      startedAt: Date.now(),
      setupCounter: 0,
      stepADesignation: null,
      reasoningLedger: null,
      projections: null,
      placed: false,
    };
    log.info(`Pipeline context initialized: weekStart=${weekStart}, anchor=${new Date(analysisPointMs).toISOString()} (the London pre-market analysis point)`);
  }
  return currentRun;
}

function resetContext(): void {
  currentRun = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// s2.8 RC-6 (the W7 wave): THE FROZEN-SNAPSHOT ENFORCEMENT (the §2.1 "close
// the charts" clause — the spec §2.8's assertNotPlaced). Once the setups tool
// has placed the run (placed = true AFTER the projections resolve), ANY E2
// (shapes) / E3 (setups) re-entry THROWS FROZEN_SNAPSHOT — the pipeline NEVER
// recomputes after the placement (the operator's workflow: "the prices action
// just fills my limit orders and hits TP/SL accordingly").
// ═══════════════════════════════════════════════════════════════════════════
function assertNotPlaced(ctx: PipelineRunContext): void {
  if (ctx.placed) {
    throw new Error(
      'FROZEN_SNAPSHOT: the orders are placed — the pipeline does not recompute after the placement (the operator\'s workflow)',
    );
  }
}

/** s2.8 RC-2 (the W7 wave): normalize a STEP A designation day-key
 *  ('Mon'..'Fri') to the chain's full day name ('Monday'..'Friday') — the
 *  exact-match pairing for the E2 keyZone override. */
function normalizeDesignationDay(raw: string): string {
  const m = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    mon: 'Monday', monday: 'Monday',
    tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday',
    wed: 'Wednesday', wednesday: 'Wednesday',
    thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday',
    fri: 'Friday', friday: 'Friday',
  };
  return map[m] ?? raw;
}

// ═══════════════════════════════════════════════════════════════════════════
// v4.5.4 Phase 7 DIAG HOOK — the diag-step-tools.ts harness (P-1..P-9) seeds
// the module-level pipeline context with fixture data so the STEP A/B tools'
// MECHANICAL FIREWALLS can be exercised directly (a fabricated zoneId → BLOCKED
// · a generic rationale → BLOCKED · a bad projection → WARN + loop continues).
// TEST-ONLY — the runtime never calls this; the interface stays unexported
// (the hook is typed structurally via the ensureContext return, so the
// PipelineRunContext shape remains private per the spec).
// ═══════════════════════════════════════════════════════════════════════════
type PipelineRunContextShape = ReturnType<typeof ensureContext>;

/** TEST-ONLY (diag-step-tools.ts): seed the module context for a weekStart.
 *  Idempotent — the same weekStart returns the same context object. The
 *  weekStart identity is NEVER overridden by the seed (a mismatch would make
 *  ensureContext re-create a fresh empty context on the next call). */
export function __seedPipelineContextForTest(weekStart: string, seed: Partial<PipelineRunContextShape>): PipelineRunContextShape {
  const ctx = ensureContext(weekStart);
  const { weekStart: _ws, ...seedFields } = seed;
  void _ws;
  Object.assign(ctx, seedFields);
  return ctx;
}

/** TEST-ONLY (diag-step-tools.ts): return the current module context, if any. */
export function __getPipelineContextForTest(): PipelineRunContextShape | null {
  return currentRun;
}

function computeZfpFromConfluence(confluence: number): number {
  // Canon Pillar 9 pressure-degree → ZFP step function (Bible Part 4.12).
  // Why a step function: confluence bands represent qualitatively different
  // institutional defense regimes — within a band the defense is constant,
  // at band boundaries it jumps. The 7→8 transition (MODERATE→MODERATE-HEAVY)
  // is the most valuable single point in the system.
  if (confluence >= 12) return 10;  // EXTREME — nearly impregnable
  if (confluence >= 10) return 20;  // HEAVY
  if (confluence >= 8)  return 30;  // MODERATE-HEAVY
  if (confluence >= 6)  return 40;  // MODERATE
  if (confluence >= 4)  return 55;  // LIGHT
  return 65;                         // MINIMAL
}

/**
 * W6-3 Phase 2: Extract the DXY macro bias from DXY's OWN shape chain.
 * Bible Part 6.5: the DXY cascade is the MACRO DIRECTION input to every FX
 * pair's Engine 3 (injected inverse), not a hard filter. Reads the DXY
 * chain's storylineBias string ("Bullish-Long continuation", "Bearish-Short
 * breakdown", "Neutral — ...") and parses the direction.
 */
function extractDxyBias(
  dxySnapshot: import('../types.js').ShapePredictionSnapshot | null | undefined,
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const bias = dxySnapshot?.shapeChain?.storylineBias?.toUpperCase() ?? '';
  if (bias.includes('BULLISH') || bias.includes('LONG')) return 'BULLISH';
  if (bias.includes('BEARISH') || bias.includes('SHORT')) return 'BEARISH';
  return 'NEUTRAL';
}

function computeATR14Pips(bars: Array<{high:number;low:number;close:number}>, pipValue: number): number {
  if (!bars || bars.length < 15) return 0;
  const slice = bars.slice(-15);
  let sum = 0;
  for (let i = 1; i < slice.length; i++) {
    const b = slice[i], p = slice[i-1];
    sum += Math.max(b.high - b.low, Math.abs(b.high - p.close), Math.abs(b.low - p.close));
  }
  return (sum / (slice.length - 1)) / pipValue;
}

/**
 * T5 (operator 2026-07-31): append lower-TF LQZ zones as INDEPENDENT rungs.
 * The telescoped 30m/15m runs produce the FINE rungs (0.5-pip separation) the
 * 1H run cannot resolve (the golden 101.235/101.240 pair). Nested rungs are
 * KEPT — never merged into the parent (mergeLqzWithIpZones would PROMOTE an
 * overlapping fine rung into the coarse zone, killing the separation). Each
 * zone mirrors the standalone DXYZone mapping from mergeLqzWithIpZones
 * (lqz-lobe.ts:542-570); a fine rung fully inside a parent-TF LQZ rung of the
 * same side carries the refined label (e.g. '30m Refined 1H') + nestedWithin.
 */
function appendTelescopedLqz(
  allZones: DXYZone[],
  rawLqz: LiquidZone[],
  pair: string,
  tf: '30m' | '15m',
  parentTf: '1H' | '30m',
): DXYZone[] {
  const pipValue = PIP_VALUE[pair] ?? 0.0001;
  const result = [...allZones];
  for (let i = 0; i < rawLqz.length; i++) {
    const lqz = rawLqz[i];
    if (!lqz) continue;
    const isBuySide = lqz.side === 'BUY_SIDE';
    const zone: DXYZone = {
      id: lqzTelescopedIdentity(pair, lqz.side, i, lqz.first_seen, lqz.level),
      timeframe: lqz.timeframe ?? tf,
      floor: lqz.bottom,
      ceiling: lqz.top,
      type: isBuySide ? ZoneType.MOM_SUPPLY : ZoneType.MOM_DEMAND,
      isBoM: false,
      sdType: 'MoM',
      sdOverlap: 'LQZ',
      reactionCount: lqz.touch_count,
      confluence: 1,
      pillars: [0],
      // LQZ-specific zfp (mirrors mergeLqzWithIpZones): fresh = Hard Wall (20),
      // +5 per 2 touches beyond 3 (exhaustion), cap 60.
      zfp: Math.min(60, 20 + Math.max(0, Math.floor((lqz.touch_count - 3) / 2)) * 5),
      createdAt: lqzTelescopedCreatedAt(lqz.first_seen),
      lastTested: lqz.last_seen > 0 ? lqz.last_seen : null,
      sdFresh: lqz.touch_count === 0 ? '0X' : lqz.touch_count === 1 ? '1S' : lqz.touch_count === 2 ? '2X' : '3X+',
      keyLevels: [lqz.level],
      formedAfterConsolidation: lqz.patterns.includes('SHORT_WICK_CONSOL'),
      liquidityScore: Math.min(10, lqz.touch_count + 3 * lqz.patterns.length),
      zoneName: `LQZ-${lqz.patterns.join('+')}`,
    };
    // Nested refinement: a fine rung fully inside a parent-TF LQZ rung of the
    // SAME side refines it — tagged, NEVER merged (Law: nested rungs are kept).
    const tol = pipValue / 2; // half-pip tolerance (the 0.5-pip fine-rung resolution)
    const parent = result.find((z) =>
      z.sdOverlap === 'LQZ' &&
      z.timeframe === parentTf &&
      z.type === zone.type &&
      zone.floor >= z.floor - tol &&
      zone.ceiling <= z.ceiling + tol,
    );
    if (parent) {
      zone.refinedLabel = `${tf} Refined ${parentTf}`;
      (zone as any).nestedWithin = parent.id; // DXYZone has no nestedWithin field (types.ts:176-221) — runtime tag
    }
    result.push(zone);
  }
  return result;
}

/**
 * T6 (operator 2026-07-31): adapt an MDVE ZoneModel to the DXYZone contract.
 * The MDVE ChartModel zones (mdve/types.ts:131-142 — top/bottom shape) must be
 * FUNCTIONAL in the emergent map (floor/ceiling, ZoneType enum, sdType), not
 * decoration — raw ZoneModel objects would produce NaN zoneMid in the setups
 * tool's ±200-pip range filter and silently vanish. Dedup by id upstream.
 */
function mdveZoneToDxyZone(mz: ZoneModel): DXYZone {
  const isBoM = mz.classification === 'BoM';
  return {
    id: mz.id,
    timeframe: mz.timeframe,
    floor: mz.bottom,
    ceiling: mz.top,
    type: mz.type === 'SUPPLY'
      ? (isBoM ? ZoneType.BOM_SUPPLY : ZoneType.MOM_SUPPLY)
      : (isBoM ? ZoneType.BOM_DEMAND : ZoneType.MOM_DEMAND),
    isBoM,
    reactionCount: mz.reactionEvents.length,
    confluence: mz.confluence,
    pillars: [],
    zfp: mz.zfp,
    createdAt: mz.formationMs,
    lastTested: null,
    sdType: isBoM ? 'BoM' : 'MoM',
    keyLevels: [mz.bottom, mz.top],
    zoneName: `MDVE ${mz.timeframe} ${mz.type} ${mz.bottom.toFixed(4)}-${mz.top.toFixed(4)}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 1: plutus-pipeline-harvest
// ═══════════════════════════════════════════════════════════════════════════════

const plutusPipelineHarvest = tool({
  description:
    'PLUTUS 4.0 Tool 1/5: Harvest OHLC bars via tvDatafeed (Python) + compute the Protocol A options entry point ' +
    '(Orders index + YYYYMMDD date token — NOT an archive URL). ' +
    'Returns bars for all 4 pairs × 4 timeframes (4H/1H/30m/15m). ' +
    'After this tool returns, you MUST perform Manual Step A: call plutus-browse-screenshot with weekStart ' +
    '(it owns the Protocol A flow), then ANALYZE the returned screenshot DIRECTLY to extract strikes.',
  args: {
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('ISO Monday date for the target week (e.g. "2026-07-06")'),
  },
  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);
    log.info(`harvest START: weekStart=${args.weekStart}`);

    try {
      // ── DIRECT tvDatafeed call via Python — first-class data source ──
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execFileAsync = promisify(execFile);

      log.info('harvest: calling tvDatafeed Python script...');
      const { stdout } = await execFileAsync('python3', ['/root/scripts/tv_fetch_ohlc.py'], {
        timeout: 120_000,
        maxBuffer: 50 * 1024 * 1024,
      });

      const rawResults = JSON.parse(stdout) as Array<{
        pair: string;
        timeframe: string;
        bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }>;
        error: string | null;
      }>;

      // Process bars: temporal filter + spot extraction
      const ohlcByPairTf: Record<string, Record<string, OHLCBar[]>> = {};
      const spots: Record<string, number> = {};
      const pairs = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];

      for (const result of rawResults) {
        if (!ohlcByPairTf[result.pair]) ohlcByPairTf[result.pair] = {};
        let bars = result.bars;
        if (result.error) {
          log.info(`harvest ${result.pair} ${result.timeframe}: ERROR — ${result.error}`);
        }
        // Temporal filter: keep bars at or before the anchor. Empty after
        // filter is a loud miss — never fall back to unfiltered future bars.
        const filtered = bars.filter((b) => b.timestamp <= ctx.temporalAnchor + 60_000);
        if (filtered.length === 0 && bars.length > 0) {
          log.info(
            `harvest ${result.pair} ${result.timeframe}: FUTURE_BAR_LEAK — ${bars.length} bars after anchor, keeping empty`,
          );
        }
        ohlcByPairTf[result.pair][result.timeframe] = filtered as OHLCBar[];
      }

      // Primary OHLC for Engine 1 = 4H bars. Spot = last 4H close.
      const ohlc: Record<string, OHLCBar[]> = {};
      for (const pair of pairs) {
        ohlc[pair] = ohlcByPairTf[pair]?.['4H'] ?? [];
        const lastBar = ohlc[pair][ohlc[pair].length - 1];
        spots[pair] = lastBar?.close ?? 0;
      }
      // W6-5: also capture spots for any OTHER pairs tvDatafeed returned
      // (USD/JPY, USD/CAD, USD/CHF, USD/SEK) — P8's DXY conversion (ICE K
      // factor) needs all 6 component spots or every conversion returns null.
      for (const result of rawResults) {
        if (result.timeframe !== '4H' || spots[result.pair] !== undefined) continue;
        const bars4h = ohlcByPairTf[result.pair]?.['4H'];
        const lastBar = bars4h?.[bars4h.length - 1];
        if (lastBar && lastBar.close > 0) spots[result.pair] = lastBar.close;
      }

      // W6-5 Part 1: Protocol A entry point — NOT an archive URL. The archive
      // URL flow 404'd (FIVE-defect forensic, bug 1). The correct entry point
      // is the Orders index; the expiry sub-page is found by matching the
      // YYYYMMDD date token inside fx-option-expiries-for- hrefs.
      const anchor = buildTemporalAnchor(args.weekStart);
      const optionsDateLink = {
        indexUrl: 'https://investinglive.com/Orders/',           // Protocol A entry point
        dateToken: anchor.fridayCompact,                          // "20260710" — YYYYMMDD discriminator
        hrefPattern: 'fx-option-expiries-for-',                   // anchor href discriminator
        label: `${anchor.fridayIso} Options Expiry`,
        weekStartIso: args.weekStart,
        fridayIso: anchor.fridayIso,
      };

      ctx.harvestData = {
        ohlc,
        ohlcByPairTf,
        spots,
        optionsDateLink,
        options: [],
        calendar: [],
      };

      // Build Manual Step A push
      const pushA = buildManualStepAPush({
        data: { optionsDateLink },
        errors: [],
        metadata: {},
      });

      const totalBars = Object.values(ohlc).reduce((n, b) => n + b.length, 0);
      log.info(`harvest DONE: ${totalBars} 4H bars (primary), ${Object.values(ohlcByPairTf).reduce((n, tfs) => n + Object.values(tfs).reduce((m, b) => m + b.length, 0), 0)} total bars across all TFs`);

      return {
        title: `Harvest Complete — ${totalBars} bars (4H primary)`,
        output: JSON.stringify({
          status: 'success',
          barsHarvested: totalBars,
          pairs: pairs.map((p) => ({
            pair: p,
            bars4H: ohlcByPairTf[p]?.['4H']?.length ?? 0,
            bars1H: ohlcByPairTf[p]?.['1H']?.length ?? 0,
            bars30m: ohlcByPairTf[p]?.['30m']?.length ?? 0,
            bars15m: ohlcByPairTf[p]?.['15m']?.length ?? 0,
            spot: spots[p],
          })),
          optionsDateLink,
          manualStepA: pushA,
          nextStep: `MANUAL STEP A: Call plutus-browse-screenshot with weekStart=${args.weekStart}. It runs Protocol A (Orders index → date link matching ${optionsDateLink.dateToken} → table screenshot → VALID/INVALID firewall) and returns a verified screenshotPath, OR declares [NO DATA] (then proceed with structural pillars only — optionsData: []). If it returns a screenshotPath, read() the screenshot DIRECTLY and extract pair, strike, notional for each row, then call plutus-pipeline-zones with optionsData (sourceScreenshot = the returned screenshotPath in every entry).`,
        }, null, 2),
      };
    } catch (e) {
      const err = toPipelineError(e, 'plutus-pipeline-harvest', 'ALL');
      log.info(`harvest FAILED: ${err.message}`);
      return {
        title: 'Harvest FAILED',
        output: JSON.stringify({ status: 'FATAL', error: err.message }),
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 2: plutus-pipeline-zones
// ═══════════════════════════════════════════════════════════════════════════════

const plutusPipelineZones = tool({
  description:
    'PLUTUS 4.0 Tool 2/5: Construct Engine 1 zones (9-pillar + 4H S/D + LQZ). ' +
    'optionsData from Manual Step A is OPTIONAL — if Protocol A declared [NO DATA], pass an empty array. ' +
    'Zone construction then proceeds with structural pillars only (8 of 9 pillars; P3/P8 contribute no options walls). ' +
    'Options walls (CRITICAL ≥ $1.5B notional = +3 confluence, SIGNIFICANT ≥ $0.85B = +2) only exist when Protocol A succeeds. ' +
    'After this tool returns, you MUST perform AGENT REASONING STEP A: read the zone map + the pressure states and call plutus-pipeline-reason-step-a with your designation[].',
  args: {
    weekStart: z.string().describe('Same weekStart as harvest.'),
    optionsData: z
      .array(z.object({
        pair: z.string(),
        strike: z.number(),
        notional: z.number().default(0),
        notionalBillions: z.number().default(0),
        bold: z.boolean().default(false),
        expiry: z.string(),
        sourceScreenshot: z.string().min(1).describe('File path of the screenshot from plutus-browse-screenshot that you analyzed.'),
      }))
      .default([])
      .describe('Options strikes extracted from Manual Step A. Pass empty array [] if Protocol A declared [NO DATA] (no expiry page for this week, firewall INVALID). [NO DATA] is a DECLARED OUTCOME — zone construction proceeds with structural pillars only. NEVER fabricate options data or substitute a different week.'),
  },
  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);

    // ── Options data is OPTIONAL — proceed with empty array if unavailable ──
    // Pillar 8 (options) is 1 of 9 pillars. The other 8 produce valid zone maps.
    // Only run the screenshot firewall if optionsData entries exist.
    if (args.optionsData && args.optionsData.length > 0) {
      // Verify EVERY entry has sourceScreenshot
      const missingScreenshots = args.optionsData.filter((d) => !d.sourceScreenshot || d.sourceScreenshot.length < 5);
      if (missingScreenshots.length > 0) {
        return {
          title: 'BLOCKED — Missing sourceScreenshot',
          output: JSON.stringify({
            status: 'BLOCKED',
            error: `${missingScreenshots.length} optionsData entries missing sourceScreenshot. Include the real screenshot path in EVERY optionsData entry, or pass an empty array to skip options data.`,
          }),
        };
      }

    // Verify the screenshot file ACTUALLY EXISTS on disk
    const { access } = await import('node:fs/promises');
    for (const opt of args.optionsData) {
      try {
        await access(opt.sourceScreenshot);
      } catch {
        return {
          title: 'BLOCKED — Screenshot file does not exist',
          output: JSON.stringify({
            status: 'BLOCKED',
            error: `Screenshot file does not exist: "${opt.sourceScreenshot}". FABRICATED DATA IS BLOCKED. You MUST call plutus-browse-screenshot first — it returns a real screenshotPath. Use THAT path.`,
            hint: 'Call plutus-browse-screenshot with weekStart. It runs Protocol A and returns a screenshotPath. Use that path in sourceScreenshot.',
          }),
        };
      }
    }

    log.info(`zones: MECHANICAL FIREWALL PASSED — ${args.optionsData?.length ?? 0} strikes with verified screenshots`);
    ctx.manualStepOutputs['A'] = { optionsData: args.optionsData ?? [] };
    } // end if (optionsData.length > 0)

    if (!ctx.harvestData) {
      return {
        title: 'Zones FAILED — no harvest data',
        output: JSON.stringify({ status: 'FATAL', error: 'No harvest data. Call plutus-pipeline-harvest first.' }),
      };
    }

    log.info(`zones START: ${args.optionsData.length} strikes`);

    try {
      const { pillarEngine } = await import('../brains/9-pillar-lobe.js');
      const { construct4HZones } = await import('../brains/4h-sd-lobe.js');
      const { detectLiquidityZones, mergeLqzWithIpZones, LQZ_LOOKBACK_BARS } = await import('../brains/lqz-lobe.js');

      const pairs = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];
      const zonesByPair: Record<string, DXYZone[]> = {};
      const scaffoldByPair: Record<string, ScaffoldRung[]> = {};
      // v4.4 MDVE: the per-pair pillar results feed the deterministic
      // ChartModels after the loop (ADDITIVE — the emergent lane's own
      // pillar consumption above is untouched).
      const pillarResultByPair: Record<string, import('../brains/9-pillar-lobe.js').PillarResult> = {};
      const errors: any[] = [];

      // W6-5 Part 4: options data must REACH the pillars. It was validated by the
      // Layer-1 firewall above, then DROPPED on the floor — pillarEngine was called
      // without optionsData/componentSpots, so P8 always scored 0 and P3 fell back
      // to a gamma proxy emitting plausible-looking fake levels.
      // Lobe contract (9-pillar-lobe.ts:177-208, computeP3:1427, computeP8:2082):
      //   optionsData?: OptionsExpiryData = { date, strikes: OptionStrike[], maxPain, totalNotional }
      //   OptionStrike.notional is in BILLIONS USD (9-pillar-lobe:2104 "already in
      //   billions"; Bible 4.5:1026 "NOTIONALS ARE ALREADY IN BILLIONS. DO NOT DIVIDE
      //   BY 1000"). The zones arg carries both notional (raw USD) and
      //   notionalBillions — pass BILLIONS or every wall classifies EXCLUDED.
      const optionsExpiryData: OptionsExpiryData | undefined = (args.optionsData?.length ?? 0) > 0
        ? (() => {
            const strikes = args.optionsData.map((d) => ({
              pair: d.pair,
              strike: d.strike,
              notional: d.notionalBillions > 0 ? d.notionalBillions : d.notional / 1e9, // BILLIONS
              expiry: d.expiry,
              type: 'unknown' as const,
            }));
            const totalNotional = strikes.reduce((n, s) => n + s.notional, 0);
            const maxPain = strikes.reduce((best, s) => (s.notional > best.notional ? s : best), strikes[0]).strike;
            return { date: strikes[0].expiry, strikes, maxPain, totalNotional };
          })()
        : undefined;

      // componentSpots for P8's DXY conversion (ICE K factor): the other 5
      // component pairs at spot. convertOptionStrikeToDXY (9-pillar-lobe:1398)
      // returns null if ANY of the 6 components is missing, so capture all.
      const componentSpots: Record<string, number> = {};
      for (const p of ['EUR/USD', 'GBP/USD', 'AUD/USD', 'USD/JPY', 'USD/CAD', 'USD/CHF', 'USD/SEK']) {
        const s = ctx.harvestData?.spots?.[p];
        if (typeof s === 'number' && s > 0) componentSpots[p] = s;
      }
      if (optionsExpiryData) {
        log.info(`zones: optionsData WIRED → ${optionsExpiryData.strikes.length} strikes, totalNotional=$${optionsExpiryData.totalNotional.toFixed(2)}B, componentSpots=${Object.keys(componentSpots).length} pairs`);
      }

      for (const pair of pairs) {
        try {
          const bars = ctx.harvestData.ohlc[pair] ?? [];
          const spot = ctx.harvestData.spots[pair] ?? 0;
          const pipVal = PIP_VALUE[pair] ?? 0.0001;

          // REAL API: pillarEngine(input: PillarInput) → PillarResult
          const pillarResult = pillarEngine({
            instrument: pair,
            bars,
            currentPrice: spot,
            optionsData: optionsExpiryData,
            componentSpots,
          });
          pillarResultByPair[pair] = pillarResult; // v4.4 MDVE: retained for the ChartModel build below

          // Convert PillarResult.levels (PriceLevel[]) into DXYZone-compatible objects
          const pillarZones: DXYZone[] = pillarResult.levels.map((lvl, i) => ({
            id: `${pair}-pillar-${i}`,
            floor: lvl.price,
            ceiling: lvl.price + pipVal * 10,
            type: lvl.price > spot ? 'IP Supply' as any : 'IP Demand' as any,
            isBoM: false,
            reactionCount: 0,
            confluence: pillarResult.compositeScore,
            pillars: [],
            zfp: computeZfpFromConfluence(pillarResult.compositeScore),
            createdAt: ANALYSIS_POINT_MS,
            lastTested: null,
            zoneName: `IP ${lvl.price > spot ? 'Supply' : 'Demand'} ${lvl.price.toFixed(4)}`,
            sdType: 'IP',
            liquidityScore: lvl.confidence * 50,
          }));

          // REAL API: construct4HZones(input: SDZoneInput) → DXYZone[]
          const sdZones = construct4HZones({
            bars,
            instrument: pair,
            spot,
            pipValue: pipVal,
            timeframe: '4H',
          });

          // T2: 4H→1H telescoping (operator 2026-07-31) — 1H S/D zones refine the
          // 4H map with sub-day structure the 4H origin candles cannot resolve.
          // Same construct4HZones engine, 1H TF-scaled params (4h-sd-lobe:105-108).
          const bars1HForSd = ctx.harvestData?.ohlcByPairTf?.[pair]?.['1H'] ?? [];
          const sdZones1H: DXYZone[] = bars1HForSd.length >= 40
            ? construct4HZones({ bars: bars1HForSd, instrument: pair, spot, pipValue: pipVal, timeframe: '1H' })
            : [];
          // Nested refinement: a 1H zone INSIDE a SAME-TYPE 4H zone refines it
          // (refinedLabel + nestedWithin); an unparented 1H zone stays an
          // independent zone (own rung on the 1H ladder).
          for (const z1h of sdZones1H) {
            z1h.timeframe = '1H'; // construct4HZones does NOT stamp the TF (4h-sd-lobe:189-207) — stamp it here
            const parent4h = sdZones.find((z4) =>
              z4.type === z1h.type &&
              z1h.floor >= z4.floor - pipVal / 2 &&
              z1h.ceiling <= z4.ceiling + pipVal / 2,
            );
            if (parent4h) {
              z1h.refinedLabel = '1H Refined 4H';
              (z1h as any).nestedWithin = parent4h.id; // DXYZone has no nestedWithin field — runtime tag
            }
          }

          // LQZ detector requires 1H candlestick patterns (NOT 4H).
          // 4H bars are for S/D order block identification only.
          // Every LQZ threshold (24-bar sweep lookback, 3-bar sharp move, 5-pip wick)
          // is calibrated for 1H volatility.
          const bars1H = ctx.harvestData?.ohlcByPairTf?.[pair]?.['1H'] ?? [];
          const lqzResult = detectLiquidityZones(pair, bars1H, LQZ_LOOKBACK_BARS);

          // T5: LQZ 1H→30m→15m telescoping (operator 2026-07-31) — the lower-TF
          // runs produce the FINE rungs (0.5-pip separation) the 1H run cannot
          // see (the golden 101.235/101.240 pair). The timeframe is the 5TH
          // detectLiquidityZones param (lqz-lobe.ts:403-409); stats stays
          // undefined. Runs are gated on bar availability — empty lower-TF data
          // leaves the 1H-only path byte-identical.
          const bars30m = ctx.harvestData?.ohlcByPairTf?.[pair]?.['30m'] ?? [];
          const bars15m = ctx.harvestData?.ohlcByPairTf?.[pair]?.['15m'] ?? [];
          const lqz30m = bars30m.length >= 40 ? detectLiquidityZones(pair, bars30m, Math.min(720, bars30m.length), undefined, '30m') : [];
          const lqz15m = bars15m.length >= 40 ? detectLiquidityZones(pair, bars15m, Math.min(720, bars15m.length), undefined, '15m') : [];

          // Merge LQZ zones INTO the IP zone map using the proper merge function.
          // mergeLqzWithIpZones takes raw LiquidZone[] (NOT converted DXYZone[]).
          // It handles: overlap detection → confluence +2, zfp -5, liquidityScore boost.
          // Non-overlapping LQZ → standalone MoM zone with proper sdType.
          let allZones = [...pillarZones, ...sdZones, ...sdZones1H]; // T2: 1H S/D refine the 4H map
          allZones = mergeLqzWithIpZones(allZones, lqzResult ?? [], pair);
          // T5: telescoped 30m/15m LQZ rungs — appended as INDEPENDENT zones
          // (nested rungs are KEPT, never merged) with their TF tags + refined
          // labels ('30m Refined 1H' / '15m Refined 30m').
          allZones = appendTelescopedLqz(allZones, lqz30m ?? [], pair, '30m', '1H');
          allZones = appendTelescopedLqz(allZones, lqz15m ?? [], pair, '15m', '30m');
          zonesByPair[pair] = allZones;

          // W7 (NEXT_STEPS §1): deterministic candidate ladder for this pair.
          // Computed AFTER zone construction from the SAME data; failure here
          // must NOT kill zone construction (own try/catch).
          try {
            const anchor = buildTemporalAnchor(args.weekStart);
            scaffoldByPair[pair] = generateCandidateLadder({
              pair,
              spot,
              pipValue: pipVal,
              weekStartMs: anchor.weekStartMs,
              anchorMs: anchor.anchorMs,
              barsByTf: {
                '4H': ctx.harvestData.ohlcByPairTf[pair]?.['4H'] ?? [],
                '1H': ctx.harvestData.ohlcByPairTf[pair]?.['1H'] ?? [],
                '30m': ctx.harvestData.ohlcByPairTf[pair]?.['30m'] ?? [],
              },
              orderBlocks4H: sdZones,
              lqzZones: lqzResult ?? [],
              pillarResult,
            });
            log.info(formatLadderForLog(pair, scaffoldByPair[pair]));
          } catch (e) {
            scaffoldByPair[pair] = [];
            errors.push(toPipelineError(e, 'plutus-pipeline-zones', `${pair}:scaffold`));
          }

          log.info(`zones ${pair}: ${pillarZones.length} pillar + ${sdZones.length} 4H S/D + ${sdZones1H.length} 1H S/D + ${(lqzResult ?? []).length} 1H LQZ + ${lqz30m.length} 30m LQZ + ${lqz15m.length} 15m LQZ (nested rungs kept) = ${allZones.length} total`);
        } catch (e) {
          errors.push(toPipelineError(e, 'plutus-pipeline-zones', pair));
          zonesByPair[pair] = [];
        }
      }

      // Build ZoneMapSnapshot
      const snapshot: ZoneMapSnapshot = {
        version: 4,
        timestamp: Date.now(),
        instrument: 'MULTI',
        zones: Object.values(zonesByPair).flat() as readonly DXYZone[],
        spots: ctx.harvestData.spots,
      };
      ctx.zoneMapSnapshot = snapshot;
      // W6-3: persist the per-pair zone maps so the shapes tool can build a
      // DEDICATED shape chain per pair (its own zones against its own spot).
      ctx.zonesByPair = zonesByPair;
      ctx.scaffoldByPair = scaffoldByPair;

      // ── v4.4 MDVE ChartModel construction (ADDITIVE deterministic stage) ──
      // Built HERE (not the setups tool) because the per-pair pillarResult
      // only exists in this scope. Consumes ONLY the already-harvested,
      // already-anchor-filtered bars — NEVER re-fetches. Fail-safe: any
      // failure leaves chartModelsByPair null and the mirror stage in the
      // setups tool declares itself unavailable → emergent-only output
      // (VEI philosophy: log, never break the report).
      ctx.pillarResultByPair = pillarResultByPair;
      try {
        const { buildChartModelsFromHarvest } = await import('./mdve-stage.js');
        ctx.chartModelsByPair = buildChartModelsFromHarvest(
          { ohlcByPairTf: ctx.harvestData.ohlcByPairTf, spots: ctx.harvestData.spots },
          pillarResultByPair,
          args.weekStart,
          pairs,
          (msg) => log.info(msg),
        );
        log.info(`zones MDVE: ChartModels built for [${Object.keys(ctx.chartModelsByPair).join(', ')}]`);
      } catch (e) {
        ctx.chartModelsByPair = null;
        log.info(`zones MDVE: ChartModel construction FAILED (non-fatal — emergent lane unaffected): ${e instanceof Error ? e.message : String(e)}`);
      }

      // ── T6: ONE ZONE MAP (operator 2026-07-31) ──
      // The telescoped MDVE zones merge into the snapshot (dedup by id), killing
      // the two-parallel-universes bug (emergent snapshot vs MDVE ChartModel).
      // The MDVE zones are adapted to the DXYZone contract (mdveZoneToDxyZone)
      // so they are FUNCTIONAL downstream (setups/shapes), not decoration.
      // Own try/catch — the convergence must NEVER break the emergent lane.
      try {
        let mdveMerged = 0;
        for (const p of pairs) {
          const mdveModel = ctx.chartModelsByPair?.[p];
          if (!mdveModel?.zones?.length) continue;
          const existingIds = new Set(zonesByPair[p].map((z) => z.id));
          for (const mz of mdveModel.zones) {
            if (existingIds.has(mz.id)) continue;
            zonesByPair[p].push(mdveZoneToDxyZone(mz));
            existingIds.add(mz.id);
            mdveMerged++;
          }
        }
        if (mdveMerged > 0) {
          // Re-flatten the snapshot from the ONE converged map (the snapshot was
          // built before the MDVE stage — the shapes tool, setups tool, and the
          // report all consume it).
          snapshot.zones = Object.values(zonesByPair).flat() as readonly DXYZone[];
          ctx.zoneMapSnapshot = snapshot;
          log.info(`zones T6: ${mdveMerged} MDVE zones merged into the one zone map (${Object.values(zonesByPair).reduce((n, v) => n + v.length, 0)} total across pairs)`);
        }
      } catch (e) {
        log.info(`zones T6: MDVE snapshot merge FAILED (non-fatal — emergent map intact): ${e instanceof Error ? e.message : String(e)}`);
      }

      // Build Manual Step B push
      const pushB = buildManualStepBPush({
        data: { zones: snapshot.zones, spots: snapshot.spots },
        errors: [],
        metadata: {},
      });

      const totalZones = Object.values(zonesByPair).reduce((n, v) => n + v.length, 0);
      const totalScaffoldRungs = Object.values(scaffoldByPair).reduce((n, v) => n + v.length, 0);
      log.info(`zones DONE: ${totalZones} total zones`);

      return {
        title: `Zones Complete — ${totalZones} zones`,
        output: JSON.stringify({
          status: errors.some((e) => e.severity === 'FATAL') ? 'FATAL' : 'success',
          totalZones,
          zonesPerPair: Object.fromEntries(Object.entries(zonesByPair).map(([k, v]) => [k, v.length])),
          scaffoldRungsPerPair: Object.fromEntries(Object.entries(scaffoldByPair).map(([k, v]) => [k, v.length])),
          scaffoldLadders: Object.fromEntries(Object.entries(scaffoldByPair).map(([k, v]) => [k, v.map((r) => ({ price: r.price, type: r.type, source: r.source, timeframe: r.timeframe, zfp: r.zfp }))])),
          spots: ctx.harvestData.spots,
          errors: errors.length > 0 ? errors : undefined,
          manualStepB: pushB,
          nextStep: `AGENT REASONING STEP A: Read the E1 zone map (zones + pressure states + lexicon classes above). For each pair/day, designate the zone the E2 shape chain will build on — zoneId (a REAL id from the zones output), role, classification, rationale (≥40 chars with a SPECIFIC price reference like 1.14540), pressureRead. Then call plutus-pipeline-reason-step-a with your designation[]. The firewall validates every zoneId against the map + the rationale format — a fabricated zoneId or a generic rationale is BLOCKED. The deterministic candidate ladder (scaffold) is computed — ${totalScaffoldRungs} rungs across pairs. These rungs will be drawn on the charts and VERIFIED (not invented) in the screenshot-verification step.`,
        }, null, 2),
      };
    } catch (e) {
      const err = toPipelineError(e, 'plutus-pipeline-zones', 'ALL');
      ctx.errors.push(err);
      return {
        title: 'Zones FAILED',
        output: JSON.stringify({ status: 'FATAL', error: err.message }),
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 3: plutus-pipeline-shapes
// ═══════════════════════════════════════════════════════════════════════════════

const plutusPipelineShapes = tool({
  description:
    'PLUTUS 4.0 Tool 3/5: Compute Engine 2 shape chain (5-day prediction). ' +
    'After this tool returns, you MUST perform AGENT REASONING STEP B: read the shape chain + the machine\'s ledger and call plutus-pipeline-reason-step-b with your decisions[].',
  args: {
    weekStart: z.string().describe('Same weekStart as harvest.'),
    reviewB: z
      .object({
        reviewedPairCount: z.number().int().min(4).default(4),
        zoneCount: z.record(z.string(), z.number().int()).default({}),
        confluenceZones: z.number().int().min(0).default(0),
        reviewer: z.literal('AGENT_TEXT_REVIEW').default('AGENT_TEXT_REVIEW'),
        notes: z.string().default(''),
      })
      .optional()
      .describe('Manual Step B output: textual zone review.'),
  },
  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);
    // s2.8 RC-6 (the W7 wave): the frozen-snapshot guard — the E2 NEVER
    // recomputes after the placement (the setups tool set placed = true).
    assertNotPlaced(ctx);

    if (args.reviewB) {
      ctx.manualStepOutputs['B'] = args.reviewB;
    }

    if (!ctx.zoneMapSnapshot) {
      return {
        title: 'Shapes FAILED — no zone map',
        output: JSON.stringify({ status: 'FATAL', error: 'No zone map. Call plutus-pipeline-zones first.' }),
      };
    }

    log.info(`shapes START`);

    try {
      // REAL API: new ShapeBrain() → setZoneMap() → compute() → ShapePredictionSnapshot
      const { ShapeBrain } = await import('../brains/shape-brain.js');

      // Per-pair shape chains (W6-3): each pair gets its OWN ShapePredictionSnapshot
      // computed from its OWN zone map against its OWN spot. The operator's doctrine:
      // "dedicated data, dedicated shape chain." The old shared MULTI chain (one
      // ShapeBrain, all zones of all 4 pairs mixed, hardcoded DXY spot) made
      // inverse prediction impossible — it was the #1 translation blocker.
      const pairs = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];
      const shapeByPair: Record<string, import('../types.js').ShapePredictionSnapshot> = {};
      for (const pair of pairs) {
        const pairSnapshot: ZoneMapSnapshot = {
          ...ctx.zoneMapSnapshot,
          instrument: pair,
          zones: ctx.zonesByPair?.[pair] ?? [],   // THIS pair's zones only (built in the zones tool)
          spots: { [pair]: ctx.harvestData?.spots?.[pair] ?? 0 },
        };
        const brain = new ShapeBrain();
        // CME §1.3 T4 / Phase 2 T4 (operator 2026-07-31): "30m is valid for MoM
        // S/D zones to identify E2 reaction points for SS/R shapes." Deliver the
        // pair's 30m MoM structure to E2 as the SS/R reaction points via
        // setZoneMap's ltfZones param (the E2's day-decomposition input — the
        // SS/R reaction-point consumption: classifyShape / applyZoneShapeExpectation
        // / buildDayDecomposition; the E3 entry pool is NOT touched — the setups
        // tool consumes the zone map separately). The pair's converged map
        // already carries the telescoped MDVE 30m MoM zones (the T6 merge in the
        // zones tool) + the 30m LQZ rungs (appendTelescopedLqz) — filter by
        // timeframe. Absent 30m zones → null → byte-identical legacy behavior.
        const ltfZones30m = (ctx.zonesByPair?.[pair] ?? []).filter((z) => z.timeframe === '30m');
        brain.setZoneMap(pairSnapshot, ltfZones30m.length > 0 ? ltfZones30m : null);
        const pairShape = await brain.compute();
        if (pairShape) shapeByPair[pair] = pairShape;
      }

      // DXY macro bias (W6-3 Phase 2): extracted ONCE from DXY's own chain, injected
      // into every FX pair's Engine 3 as an explicit inverse-direction parameter
      // (Bible Part 6.5: DXY cascade = MACRO DIRECTION, not hard filter).
      const dxyBias = extractDxyBias(shapeByPair['DXY']);
      ctx.dxyMacroBias = dxyBias;

      // Backward compat: ctx.shapeSnapshot remains the DXY chain (report §7,
      // setups-tool prerequisite check, Manual Step C push all consume it).
      const snapshot = shapeByPair['DXY'] ?? null;
      ctx.shapeByPair = shapeByPair;

      if (!snapshot) {
        return {
          title: 'Shapes FAILED — compute returned null',
          output: JSON.stringify({ status: 'FATAL', error: 'ShapeBrain.compute() returned null — check zone map.' }),
        };
      }

      ctx.shapeSnapshot = snapshot;

      // ── s2.8 RC-2 (the W7 wave): THE STEP A CONSUMER — the designation's
      //    zoneIds feed the E2 chain's keyZone selection (the E2's contracted
      //    input). The STEP A tool wrote ctx.stepADesignation; the E2 now OBEYS
      //    it — the designated zone becomes the day's keyZone (exact-match per
      //    pair/day, the 2026-07-31 "exact-match authoritative" ruling — the B2
      //    law: "the shapes tool builds the chain ON the designated zones").
      //    The override writes the dayDecomposition (the E3's
      //    selectPairNativeZone authority) + the dayByDay (the STEP B ledger's
      //    chain read); the machine's own picks stay intact for the days
      //    WITHOUT a designation. The STEP A firewall already validated the
      //    zoneId membership — no re-validation here. ──
      const stepADesignations = ctx.stepADesignation ?? [];
      if (stepADesignations.length > 0) {
        for (const pair of pairs) {
          const chain = shapeByPair[pair]?.shapeChain;
          if (!chain) continue;
          for (const d of stepADesignations.filter((dd) => dd.pair === pair)) {
            const dayKey = normalizeDesignationDay(d.day);
            const decomp = (chain.dayDecomposition ?? []).find((e) => normalizeDesignationDay(e.day) === dayKey);
            if (decomp) {
              decomp.keyZoneId = d.zoneId;
              decomp.keyZoneType = d.role;
              if (d.role === 'SUPPLY') decomp.supplyZoneId = d.zoneId;
              if (d.role === 'DEMAND') decomp.demandZoneId = d.zoneId;
            }
            const entry = (chain.dayByDay ?? []).find((e) => normalizeDesignationDay(e.day) === dayKey);
            if (entry) entry.keyZoneId = d.zoneId;
            log.info(`shapes STEP A: ${pair} ${dayKey} keyZone = the designated ${d.zoneId} (${d.role}) — the E2 obeys (the B2 law)`);
          }
        }
      }

      // Build Manual Step C push
      const pushC = buildManualStepCPush({
        data: { chain: snapshot.shapeChain.chain },
        errors: [],
        metadata: {},
      });

      log.info(`shapes DONE: DXY ${snapshot.shapeChain.chain.length} day chain, bias=${snapshot.shapeChain.storylineBias} | dxyMacroBias=${dxyBias} | per-pair: ${pairs.map((p) => `${p}=${shapeByPair[p]?.shapeChain.currentShape ?? 'FAIL'}`).join(' ')}`);

      return {
        title: `Shapes Complete — ${Object.keys(shapeByPair).length} per-pair chains`,
        output: JSON.stringify({
          status: 'success',
          currentShape: snapshot.shapeChain.currentShape,
          storylineBias: snapshot.shapeChain.storylineBias,
          chainLength: snapshot.shapeChain.chain.length,
          consolidationPhase: snapshot.shapeChain.consolidationPhase,
          dxyMacroBias: dxyBias,
          perPairChains: Object.fromEntries(pairs.map((p) => [p, {
            currentShape: shapeByPair[p]?.shapeChain.currentShape ?? null,
            storylineBias: shapeByPair[p]?.shapeChain.storylineBias ?? null,
            chainLength: shapeByPair[p]?.shapeChain.chain.length ?? 0,
          }])),
          manualStepC: pushC,
          nextStep: `AGENT REASONING STEP B: The machine's ledger (tokens 1-7 + 9 — the zone identification, the pressure, the liquidity, the break-validation, the strength, the reaction count, the chain position) is computed from THIS shape chain + the E1 zone map. You perform the judgment tokens in your own context: T8 the forward-position (the path from the day's open to the designated zone), T10 the anchor construction (E/SL/TP as checkable numbers), T11 the validation. Then call plutus-pipeline-reason-step-b with your decisions[] — the machine validates (the WARN set W-1..W-7 — a WARN continues the loop, never a hard-kill) and assembles the full TradeProjections.`,
        }, null, 2),
      };
    } catch (e) {
      const err = toPipelineError(e, 'plutus-pipeline-shapes', 'ALL');
      ctx.errors.push(err);
      return {
        title: 'Shapes FAILED',
        output: JSON.stringify({ status: 'FATAL', error: err.message }),
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 4: plutus-pipeline-charts — Screenshot verification + ZIP directive
// The agent IS MiMo — it reads images directly via the read tool.
// This tool verifies screenshots exist and returns the ZIP protocol directive
// (Manual Step D): read each screenshot, produce ZONE| lines, then submit the
// validatedZones array to plutus-pipeline-setups.
// ═══════════════════════════════════════════════════════════════════════════════

const plutusPipelineCharts = tool({
  description:
    'PLUTUS 4.0 Tool 4/5: Verify TradingView screenshots and issue the ZIP protocol directive (Manual Step D). ' +
    'REQUIRES screenshots captured by the agent via MCP tools during Manual Step C. ' +
    'This tool verifies files exist, stores them in context, and returns the ZIP protocol ' +
    'directive (ZONE| format) telling you to read each screenshot and produce validatedZones ' +
    'from visual analysis. YOU ARE THE VLM — MiMo sees images directly when you call read().',
  args: {
    weekStart: z.string().describe('Same weekStart as harvest.'),
    reviewC: z
      .object({
        chainReviewed: z.boolean().default(true),
        reviewer: z.literal("AGENT_SHAPE_REVIEW").default("AGENT_SHAPE_REVIEW"),
      })
      .optional()
      .describe("Manual Step C output: shape chain review."),
    screenshots: z
      .array(z.object({
        pair: z.string().describe("Pair name, e.g. DXY, EUR/USD"),
        timeframe: z.string().describe("Timeframe, e.g. 4H, 1H"),
        path: z.string().describe("Absolute file path to the screenshot PNG captured via tv_screenshot + write"),
      }))
      .min(1)
      .describe("Screenshots captured by the agent via MCP browser tools. Each path MUST be a real file on disk."),
    zoneAnalysis: z.string().optional().describe(
      'DO NOT pass zoneAnalysis to THIS tool — it belongs to plutus-pipeline-setups (Tool 5). ' +
      'If you have ZONE| lines ready, call plutus-pipeline-setups with weekStart + zoneAnalysis AFTER this tool completes.'),
  },
  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);

    if (args.reviewC) {
      ctx.manualStepOutputs["C"] = args.reviewC;
    }

    if (!ctx.zoneMapSnapshot) {
      return {
        title: "Charts FAILED — no zone map",
        output: JSON.stringify({ status: "FATAL", error: "No zone map. Call plutus-pipeline-zones first." }),
      };
    }

    if (!args.screenshots || args.screenshots.length === 0) {
      return {
        title: "Charts FAILED — no screenshots",
        output: JSON.stringify({
          status: "FATAL",
          error: "No screenshots provided. Capture TradingView screenshots via MCP tools (tv_navigate, tv_screenshot, write) before calling this tool.",
        }),
      };
    }

    log.info(`charts START: ${args.screenshots.length} screenshots to verify`);

    const { access, stat } = await import("node:fs/promises");
    const screenshots: Array<{ pair: string; timeframe: string; path: string; capturedAt: number }> = [];

    // Verify all screenshot files exist and are > 1KB
    for (const shot of args.screenshots) {
      try {
        await access(shot.path);
        const s = await stat(shot.path);
        if (s.size < 1024) {
          return {
            title: `Charts FAILED — screenshot too small: ${shot.path}`,
            output: JSON.stringify({ status: "FATAL", error: `Screenshot ${shot.path} is only ${s.size} bytes. Re-capture via tv_screenshot.` }),
          };
        }
        screenshots.push({ pair: shot.pair, timeframe: shot.timeframe, path: shot.path, capturedAt: Date.now() });
      } catch {
        return {
          title: `Charts FAILED — file not found: ${shot.path}`,
          output: JSON.stringify({
            status: "FATAL",
            error: `Screenshot file does not exist: ${shot.path}. Capture via MCP tools before calling this tool.`,
          }),
        };
      }
    }

    ctx.screenshots = screenshots;
    log.info(`charts: ${screenshots.length} screenshots verified, returning ZIP directive (ZONE| format, Manual Step D)`);

    // Return directive: agent must read each screenshot and produce validatedZones.
    // ZIP PHASE 2 protocol — INLINED from ZONE_PROMPT_TEMPLATE (src/tvi/zip.ts).
    // NOTE: this text MUST stay in sync with ZONE_PROMPT_TEMPLATE in src/tvi/zip.ts
    // (parallel-owned file — engine.ts uses static text to avoid a merge-time import
    // ordering hazard; any change to the ZIP protocol must be applied in BOTH places).
    const readDirectives = screenshots.map(s =>
      `read({filePath: "${s.path}"})`
    ).join('\n  ');

    const pairs = [...new Set(screenshots.map(s => s.pair))];

    // W7 scaffold verdict flow (NEXT_STEPS §1.2): the deterministic candidate
    // ladder is the PRIMARY zone-identity set — the agent emits ONE verdict line
    // per rung instead of inventing zones from scratch.
    const { SCAFFOLD_VERDICT_PROMPT_TEMPLATE } = await import('../tvi/zip.js');
    const scaffoldSections = pairs.map((p) => {
      const rungs = ctx.scaffoldByPair?.[p] ?? [];
      if (rungs.length > 0) {
        return `### ${p}\n${SCAFFOLD_VERDICT_PROMPT_TEMPLATE(p, ctx.harvestData?.spots[p] ?? 0, rungs)}`;
      }
      return `### ${p}\nNo scaffold for ${p} — use the legacy zone-identification flow for this pair.`;
    }).join('\n\n');

    return {
      title: `Charts: ${screenshots.length} screenshots verified — Manual Step D (ZIP Phase 2) required`,
      output: JSON.stringify({
        status: "success",
        screenshotCount: screenshots.length,
        screenshots: screenshots.map(s => ({ pair: s.pair, timeframe: s.timeframe, path: s.path })),
        scaffoldRungs: Object.fromEntries(pairs.map(p => [p, (ctx.scaffoldByPair?.[p] ?? []).map(r => ({ price: r.price, top: r.top, bottom: r.bottom, type: r.type, timeframe: r.timeframe, source: r.source, classification: r.classification, zfp: r.zfp }))])),
        directive: `MANUAL STEP D: TVI ZONE IDENTIFICATION (ZIP PHASE 2 — READ AND IDENTIFY)

Screenshots VERIFIED on disk. NOW do Manual Step D: read() each PNG, produce ZONE| lines,
then call plutus-pipeline-SETUPS (Tool 5 — NOT this charts tool) with weekStart AND
zoneAnalysis set to your ZONE| lines as raw text (grouped under pair headers).
${typeof args.zoneAnalysis === 'string' && args.zoneAnalysis.length > 0 ? '\n⚠ NOTE: you passed zoneAnalysis to THIS charts tool — it is IGNORED here. Pass it to plutus-pipeline-SETUPS (Tool 5) instead.\n' : ''}
You ARE MiMo v2.5 — a MULTIMODAL model. read() on a .png file RENDERS the image to you
directly. That is the ONLY way you look at screenshots.
DO NOT use plutus-omni-vision for these screenshots (that is for VIDEO only).
DO NOT try to read base64 text.

⚠ SCREENSHOT RELIABILITY: tv_screenshot AUTO-SAVES the PNG to /tmp/tv-screenshot-*.png
and returns the path. read() THAT path directly — it is a real binary PNG on disk.
If a specific path is missing (File not found), call tv_screenshot AGAIN for a fresh
auto-path. Do NOT attempt base64 extraction — tool results truncate large base64 blobs,
so the full base64 is never accessible to you. The auto-saved path IS the screenshot.

⚠ PIPELINE DISCIPLINE: if plutus-pipeline-setups BLOCKS (any [TVI] error), do NOT hand-write
setups or a report. Hand-written setups are fabrication, REJECTED by doctrine. The ONLY valid
path: fix zone production and call plutus-pipeline-setups again. The setups tool + Engine 3
generator is the ONLY sanctioned setup source.

STEP 1 — READ ALL SCREENSHOTS (in parallel):
  batch({tool_calls: [
${screenshots.map(s => `    {tool: "read", parameters: {filePath: "${s.path}"}}`).join(',\n')}
  ]})

STEP 2 — EMIT ONE VERDICT LINE PER SCAFFOLD RUNG for EACH pair (DXY FIRST — DXY is the master compass).
⚠ TEMPORAL INTEGRITY (CRITICAL): your screenshots MUST show the week of ${args.weekStart} — the
report week's Monday-Friday candles, NOT the live right-edge price. If a screenshot shows price
action AFTER that week, your verdicts are judging rungs by the FUTURE (forward leakage — every
rung looks "broken through"). RE-CAPTURE the chart panned to the report week before reading.
Judge each rung ONLY by what candles did DURING the report week.
The scaffold rungs (scaffoldLadders from the zones tool output, repeated in scaffoldRungs
below) are the PRIMARY zone-identity set. Do NOT invent levels from scratch — VERIFY the
drawn rungs. For EACH rung, emit EXACTLY ONE verdict line:
ZONE|verdict|type|top|bottom|timeframe|classification|confidence|evidence

Where:
  - verdict: CONFIRMED (the level is visibly reacting — wick cluster / engulfing / sweep),
    REJECTED (price ignores it — closes through without reaction), WEAK (marginal, ambiguous)
  - type/top/bottom/timeframe: COPY from the rung's OWN entry in the scaffoldRungs list below
  - classification: UNMITIGATED if no candle has entered the zone since formation,
    else BoM/MoM per the structure
  - confidence: your certainty IN THE VERDICT (a certain rejection = 60-75, NOT 80+)
  - evidence: the SPECIFIC candle evidence at the level with EXACT prices
    (e.g. "3 upper wicks rejecting from 101.190", "bullish engulfing at 100.945",
    "two closes through 100.740 with no wick rejection — level not defended")

OFF-SCAFFOLD ADDITIONS: up to 3 per pair — a STRONG zone NOT in the scaffold list
(an unmitigated order block or liquidity sweep the computation missed). Same verdict
line with verdict=CONFIRMED and a 10th field VLM_NEW:
ZONE|CONFIRMED|type|top|bottom|timeframe|classification|confidence|evidence|VLM_NEW

SPOT PRICES (from harvest):
${screenshots.map(s => {
  const spot = ctx.harvestData?.spots[s.pair] ?? 0;
  return `  ${s.pair}: spot=${spot}`;
}).join('\n')}

PER-PAIR SCAFFOLD VERDICT PROMPTS (the rungs you MUST emit verdicts for):
${scaffoldSections}

VEB GATES YOU WILL HIT (violations BLOCK the pipeline):
  P1 MUST_READ_SCREENSHOT: you must have read() the screenshot PNGs — every zone's
     sourceScreenshot MUST be a real file on disk (verified mechanically).
  P2 ≥3 verdict lines total (verdict lines parse as VLM_CONFIRMED by default; more is
     better). ONE verdict line per scaffold rung is REQUIRED — skipped rungs are recorded
     as SCAFFOLD_UNVERIFIED and weaken your own setup map. REJECTED verdicts still need
     SPECIFIC evidence (why the level is not defended, with exact prices).
  P3 BOTH SIDES per pair: SUPPLY AND DEMAND required for every pair.
  P4 NO type-IP zones: only S/D zones (BoM/MoM/UNMITIGATED) and LIQUIDITY zones are
     valid entry zones. Engine-1 IP zones are confluence context — NOT entries.
  Plus: evidence ≥20 chars with EXACT prices; generic text ("zone confirmed",
  "looks good", "valid zone", bare "order block") is BLOCKED.

STEP 3 — Convert your ZONE| lines into the validatedZones array and call
plutus-pipeline-setups:
  {
    "weekStart": "<same weekStart>",
    "validatedZones": [
      { "pair": "<pair>", "type": "SUPPLY"|"DEMAND"|"LIQUIDITY", "top": <n>, "bottom": <n>,
        "timeframe": "4H", "classification": "BoM"|"MoM"|"UNMITIGATED",
        "verdict": "CONFIRMED" | "REJECTED" | "WEAK",
        "source": "VLM_CONFIRMED"|"VLM_NEW", "confidence": 0-100,
        "visualEvidence": "<exact pattern with exact prices>",
        "sourceScreenshot": "<path from the screenshots list above>" }
      // one object per ZONE| line, covering ALL pairs
    ]
  }`,
        nextStep: "MANUAL STEP D: read() each screenshot PNG above. For EACH scaffold rung (listed per pair above), PERCEIVE whether the level is actually reacting and emit ONE verdict line (ZONE|verdict|type|top|bottom|timeframe|classification|confidence|evidence). Then call plutus-pipeline-setups with weekStart AND zoneAnalysis (your verdict lines as raw text under pair headers).",
      }, null, 2),
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL 5: plutus-pipeline-setups
// ═══════════════════════════════════════════════════════════════════════════════

const plutusPipelineSetups = tool({
  description:
    'PLUTUS 4.0 Tool 5/5: Generate visual trade setups from validated zones. ' +
    'Accepts EITHER: (a) zoneAnalysis — your ZONE| lines as raw text (the harness parses them deterministically via the ZIP protocol), OR (b) validatedZones — an array of zone objects. ' +
    'Produces the final TTE report. FABRICATED DATA IS HARD-BLOCKED. ' +
    'After this tool returns, you MUST call plutus-pipeline-gate with weekStart — the W6 golden gate runs the G1-G10 verdicts and resets the pipeline context.',
  args: {
    weekStart: z.string().describe('Same weekStart as harvest.'),
    zoneAnalysis: z.string().optional().describe(
      'OPTION A (preferred): your ZONE| lines as raw text from Manual Step D. ' +
      'Format per line: ZONE|verdict|type|top|bottom|timeframe|classification|confidence|evidence (scaffold verdict flow — verdict = CONFIRMED/REJECTED/WEAK) or the legacy ZONE|type|top|bottom|timeframe|classification|confidence|evidence. ' +
      'Group lines under pair headers (DXY, EUR/USD, GBP/USD, AUD/USD). The harness parses + verifies each line deterministically (zip.parseZoneLines).'),
    validatedZones: z
      .array(z.object({
        pair: z.string(),
        type: z.enum(['SUPPLY', 'DEMAND', 'LIQUIDITY']),
        top: z.number(),
        bottom: z.number(),
        timeframe: z.enum(['4H', '1H', '30m', '15m']),
        classification: z.enum(['BoM', 'MoM', 'BOSM', 'UNMITIGATED']).default('UNMITIGATED'),
        source: z.enum(['VLM_CONFIRMED', 'VLM_NEW', 'VLM_REJECTED']).default('VLM_CONFIRMED'),
        confidence: z.number().min(0).max(100).default(50),
        verdict: z.enum(['CONFIRMED', 'REJECTED', 'WEAK']).optional(),
        // TVI §6.4: enrichment fields are OPTIONAL — the harness populates them
        // via enrichWithEngine1 (??= semantics: agent-set values win, omitted
        // values are filled from the nearest Engine-1 zone). Schema defaults
        // here would defeat enrichment (a defaulted 0/'' is not nullish).
        reactionCount: z.number().int().optional(),
        liquidityScore: z.number().optional(),
        mappedIPZoneName: z.string().optional(),
        visualEvidence: z.string().min(20).describe('REQUIRED: Specific candlestick pattern observed (e.g. "order block at 1.0850 confirmed by bullish engulfing + 3-wick rejection"). Generic strings are BLOCKED.'),
        sourceScreenshot: z.string().min(5).describe('REQUIRED: Screenshot path from plutus-pipeline-charts that you analyzed. MUST be a real file.'),
      }))
      .optional()
      .describe('OPTION B: VLM-validated zones as objects from Manual Step D. If omitted, provide zoneAnalysis text instead.'),
  },
  async execute(args): Promise<ToolResult> {
    const ctx = ensureContext(args.weekStart);
    // s2.8 RC-6 (the W7 wave): the frozen-snapshot guard — the E3 NEVER
    // recomputes after the placement (placed = true set below, after the
    // projections resolve).
    assertNotPlaced(ctx);

    // ── ZONE| TEXT PARSING (ZIP §6.3 — the harness-parse path) ──
    // The agent produces ZONE| lines as TEXT in its response. The harness parses
    // them deterministically — the spec's original design (model PERCEIVES,
    // harness DECIDES, harness VERIFIES). Lines are assigned to pairs by pair
    // headers (DXY/EUR/USD/GBP/USD/AUD/USD); headerless lines fall back to
    // price-magnitude assignment (nearest spot).
    const agentZones: any[] = [...(args.validatedZones ?? [])];
    if (typeof args.zoneAnalysis === 'string' && args.zoneAnalysis.includes('ZONE|')) {
      const { parseZoneLines } = await import('../tvi/zip.js');
      const PAIRS4 = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];
      const spots = ctx.harvestData?.spots ?? {};
      // Split into per-pair sections by pair headers.
      const headerRe = /(DXY|EUR\/?USD|EURUSD|GBP\/?USD|GBPUSD|AUD\/?USD|AUDUSD)/i;
      const lines = args.zoneAnalysis.split('\n');
      const sections: Record<string, string[]> = {};
      let currentPair = '';
      const normPair = (raw: string): string => {
        const u = raw.toUpperCase().replace('_', '');
        if (u.includes('DXY')) return 'DXY';
        if (u.includes('EUR')) return 'EUR/USD';
        if (u.includes('GBP')) return 'GBP/USD';
        if (u.includes('AUD')) return 'AUD/USD';
        return '';
      };
      for (const ln of lines) {
        if (!ln.startsWith('ZONE|') && headerRe.test(ln) && ln.trim().length < 80) {
          currentPair = normPair(ln);
        }
        if (ln.startsWith('ZONE|')) {
          const key = currentPair || '__unassigned__';
          (sections[key] ??= []).push(ln);
        }
      }
      for (const [pairKey, sectionLines] of Object.entries(sections)) {
        let pair = pairKey;
        if (pair === '__unassigned__') {
          // Price-magnitude fallback: assign by nearest spot.
          const mid = sectionLines.map(l => parseFloat(l.split('|')[2] ?? '0')).filter(n => Number.isFinite(n) && n > 0);
          const avg = mid.length > 0 ? mid.reduce((a, b) => a + b, 0) / mid.length : 0;
          let best = ''; let bestDist = Infinity;
          for (const p of PAIRS4) {
            const s = spots[p] ?? 0;
            const d = Math.abs(avg - s);
            if (s > 0 && d < bestDist) { bestDist = d; best = p; }
          }
          pair = best || 'DXY';
        }
        const spot = spots[pair] ?? 0;
        const shot = ctx.screenshots.find(s => s.pair === pair);
        const { zones, rejected } = parseZoneLines(sectionLines.join('\n'), pair, shot?.path ?? '', spot);
        for (const z of zones) agentZones.push(z as any);
        for (const r of rejected) log.info(`[TVI-ZIP] text-parse rejected ${pair}: ${r.reason}`);
        log.info(`[TVI-ZIP] text-parse ${pair}: ${zones.length} zones parsed from zoneAnalysis`);
      }
    }
    if (agentZones.length < 3) {
      return {
        title: 'BLOCKED — insufficient validated zones',
        output: JSON.stringify({ status: 'BLOCKED', error: `Only ${agentZones.length} validated zones (need ≥3). Produce ZONE| lines from chart screenshots and pass them as zoneAnalysis text OR validatedZones objects.` }),
      };
    }

    // ── MECHANICAL FIREWALL: Block fabricated validatedZones ──
    // Every zone MUST have a sourceScreenshot that EXISTS on disk + specific visualEvidence.
    const { access } = await import('node:fs/promises');

    for (const vz of agentZones) {
      // Check screenshot exists
      try {
        await access(vz.sourceScreenshot);
      } catch {
        return {
          title: 'BLOCKED — Screenshot file does not exist',
          output: JSON.stringify({
            status: 'BLOCKED',
            error: `Zone ${vz.pair} ${vz.type} sourceScreenshot does not exist: "${vz.sourceScreenshot}". FABRICATED DATA IS BLOCKED. You MUST call plutus-pipeline-charts first — it produces real screenshots at /tmp/. Use THOSE paths.`,
          }),
        };
      }
      // Check visualEvidence is specific (not generic)
      const evidence = vz.visualEvidence.toLowerCase();
      const GENERIC_PATTERNS = ['zone confirmed', 'order block', 'valid zone', 'looks good', 'confirmed zone', 'validated'];
      const isGeneric = GENERIC_PATTERNS.some((p) => evidence === p || evidence.length < 20);
      if (isGeneric) {
        return {
          title: 'BLOCKED — Generic visualEvidence',
          output: JSON.stringify({
            status: 'BLOCKED',
            error: `Zone ${vz.pair} ${vz.type} has generic visualEvidence: "${vz.visualEvidence}". You MUST describe the SPECIFIC candlestick pattern you observed in the screenshot (e.g. "bullish engulfing at zone edge with 3-wick rejection from 1.0850"). Generic text is BLOCKED.`,
          }),
        };
      }
    }

    // ── ZIP HARNESS VERIFICATION (TVI §6.3): 8 deterministic gates per zone ──
    // This is Layer 3 of the MLV (spec §7): Engine-1 detected it (Layer 1),
    // the agent identified it (Layer 2), the harness validates it (Layer 3).
    // The 3-layer firewall above stays FIRST (file existence, price refs,
    // generic evidence); this pass complements it (structure, type, entry-type).
    // Gates 1-5 + 7-8 run here at the array level (spot-independent). Gate 6
    // (DISTANCE) is spot-scoped — it runs per-pair inside the loop below.
    const { verifyZone } = await import('../tvi/zip.js');
    const zipVerifiedZones: any[] = [];
    for (const vz of agentZones) {
      const v = verifyZone(vz as any, vz.pair, NaN); // NaN spot → DISTANCE gate deferred to per-pair pass
      if (v.passed) {
        zipVerifiedZones.push(vz);
      } else {
        log.info(`[TVI-ZIP] REJECTED ${vz.pair} ${vz.type} ${vz.top}-${vz.bottom} — [${v.gate}] ${v.reason}`);
      }
    }
    if (zipVerifiedZones.length < agentZones.length) {
      log.info(`[TVI-ZIP] array-level pass: ${zipVerifiedZones.length}/${agentZones.length} zones verified (${agentZones.length - zipVerifiedZones.length} rejected)`);
    }

    log.info(`setups: MECHANICAL FIREWALL PASSED — ${agentZones.length} zones with verified screenshots + specific evidence`);
    ctx.manualStepOutputs['D'] = { validatedZones: zipVerifiedZones };
    ctx.validatedZones = zipVerifiedZones;

    log.info(`setups START: ${zipVerifiedZones.length} ZIP-verified zones (${agentZones.length} submitted)`);

    try {
      // ── s2.8 RC-3 (the W7 wave): THE STEP B CONSUMER — the setups/E3 path
      //    resolves the STEP B projections' E/SL/TP anchors (the E3's contracted
      //    input — the data-dead disconnection closed). The E3-NEVER is honored
      //    first: every projection must pass assertProjectionContract; a
      //    violation is recorded (never silently dropped) and the projection is
      //    EXCLUDED from the anchor injection below. STEP B itself asserted the
      //    contract before storing — this re-assert is the E3's own boundary
      //    check (belt-and-suspenders, the honest report). ──
      const stepBProjections = (ctx.projections ?? []).filter((p) => p && p.E !== undefined);
      const projectionContractViolations: string[] = [];
      for (const proj of stepBProjections) {
        try {
          assertProjectionContract(proj);
        } catch (e) {
          projectionContractViolations.push(`${proj.setupId}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (projectionContractViolations.length > 0) {
        ctx.errors.push({
          stage: 'plutus-pipeline-setups',
          pair: 'ALL',
          severity: 'ERROR',
          message: `STEP B projections failed the E3-NEVER contract (assertProjectionContract): ${projectionContractViolations.join(' | ')} — the violating projections are excluded from the anchor injection`,
          context: { violations: projectionContractViolations },
          timestamp: Date.now(),
        });
      }

      // Validate Manual Step D output (ZIP-verified zones only — the array-
      // level verifyZone pass above already filtered structural/type/evidence
      // failures; VLM_REJECTED-source zones are excluded here as before).
      const validZones = zipVerifiedZones.filter(
        (v) => v.source === 'VLM_CONFIRMED' || v.source === 'VLM_NEW',
      );
      if (validZones.length < 3) {
        return {
          title: 'Manual Step D INSUFFICIENT',
          output: JSON.stringify({
            status: 'BLOCKED',
            error: `Only ${validZones.length} VLM_CONFIRMED/VLM_NEW zones. Need ≥3.`,
          }),
        };
      }

      if (!ctx.zoneMapSnapshot || !ctx.shapeSnapshot) {
        return {
          title: 'Setups FAILED — missing prerequisites',
          output: JSON.stringify({ status: 'FATAL', error: 'Missing zone map or shape snapshot.' }),
        };
      }

      // REAL API: VisualSetupGenerator.generateSetups(zoneMap, shapePrediction, visualZones, pair, spot, setupCounter, momentum?, atr?)
      const { VisualSetupGenerator } = await import('../engine3/visual-setup-generator.js');
      const generator = new VisualSetupGenerator();

      const pairs = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];
      const allSetups: TradeSetup[] = [];
      let setupCounter = 0;

      for (const pair of pairs) {
        const spot = ctx.harvestData?.spots[pair] ?? 0;
        const pipVal = PIP_VALUE[pair] ?? 0.0001;

        // ZIP gate 6 (DISTANCE, TVI §6.3) is spot-scoped — it runs HERE, per
        // pair, where the harvested spot exists (never a single hardcoded spot
        // across pairs). Gates 1-5/7-8 already ran at the array level above.
        const pairValidated = validZones.filter((v) => v.pair === pair).filter((v) => {
          const v6 = verifyZone(v as any, pair, spot > 0 ? spot : NaN);
          if (v6.passed) return true;
          log.info(`[TVI-ZIP] REJECTED ${pair} ${v.type} ${v.top}-${v.bottom} — [${v6.gate}] ${v6.reason}`);
          return false;
        });

        // ── ALWAYS merge Engine 1 IP zones with VLM zones ──
        // VLM zones = visual confirmation from agent reading charts.
        // IP zones = structural backbone from 9-pillar analysis.
        // Setup generator needs BOTH for proper TP/SL targeting across full price range.
        // BUG-31 fix: the merge now happens BEFORE the pair-skip, so a pair with
        // thin VLM coverage is carried by honestly-labeled Engine-1 candidates.
        const pairScreenshot = ctx.screenshots.find((s) => s.pair === pair && s.timeframe === '4H');
        const pairKey = pair.replace('/', '').toLowerCase();
        const isDXY = pair === 'DXY';

        const sortedEngine1Zones = ctx.zoneMapSnapshot.zones.filter((z) => {
          const match = z.id?.toLowerCase().includes(pairKey) || z.zoneName?.includes(pair);
          if (!match) return false;
          // Only include zones within reasonable distance of spot (±200 pips)
          // This prevents zones from 90 days ago (far from current trading range) from generating setups
          const zoneMid = (z.ceiling + z.floor) / 2;
          const distFromSpot = Math.abs(zoneMid - spot);
          const maxDist = isDXY ? 2.00 : 0.020; // DXY: ±2.00 points, FX: ±200 pips
          return distFromSpot <= maxDist;
        })
        .sort((a, b) => {
          // Boosted-confluence sort (spec §5.5): BoM/LQZ zones carry ENTRY-PRIMARY
          // status and the deepest institutional commitment — surface them over
          // pivot/MA-derived virgin-MoM zones of equal raw confluence.
          const isBoMA = a.sdType === 'BoM';
          const isLqzA = a.sdOverlap === 'LQZ' || (a.zoneName?.includes('LQZ') ?? false);
          const sortKeyA = (a.confluence ?? 0) + ((isBoMA || isLqzA) ? 5 : 0);
          const isBoMB = b.sdType === 'BoM';
          const isLqzB = b.sdOverlap === 'LQZ' || (b.zoneName?.includes('LQZ') ?? false);
          const sortKeyB = (b.confluence ?? 0) + ((isBoMB || isLqzB) ? 5 : 0);
          return sortKeyB - sortKeyA;
        });

        // W6-4 Fix 1: the fallback pool must include 4H S/D and LQZ zones, not just
        // high-confluence pillar zones. The boosted sort (confluence + 5 for BoM/LQZ)
        // buried real walls under pillar sortKey 12-19 → GBP's structure never became
        // a fallback candidate (W6 run: GBP=1).
        // Interleave: top-15 pillar zones (confluence-driven) + ALL 4H S/D + LQZ zones
        // in range (they are few — typically 3-8/pair). Pillar provides breadth,
        // 4H/LQZ provides the real walls and rungs.
        const pillarZones = sortedEngine1Zones.filter(z => z.sdType !== 'BoM' && z.sdType !== 'MoM' && z.sdOverlap !== 'LQZ' && !(z.zoneName?.includes('LQZ') ?? false));
        const structuralZones = sortedEngine1Zones.filter(z => z.sdType === 'BoM' || z.sdType === 'MoM' || z.sdOverlap === 'LQZ' || (z.zoneName?.includes('LQZ') ?? false));
        const pairEngine1Zones = [
          ...structuralZones,   // ALL real-structure zones in range (4H BoM/MoM + LQZ — the walls and rungs)
          ...pillarZones.slice(0, Math.max(0, 30 - structuralZones.length)),  // top pillar zones fill the rest
        ].slice(0, 30); // was 20 — enlarged WITHIN the ±200p gate (NOT the 40-checkpoint's unfiltered 30)

        // ── Engine-1 enrichment (spec §5.2 / TVI §6.4): full enrichment via
        // enrichWithEngine1 — populates mappedIPZoneName + confluence + zfp +
        // liquidityScore + reactionCount from the nearest Engine-1 zone
        // (1-pip interval-gap threshold, midpoint-ranked), with a '_LQZ'
        // source suffix on LQZ matches. Confluence check 5 (gen:565) fires
        // for VLM zones too — genuine dual-source confluence. Enrichment runs
        // BEFORE the FALLBACK push below (enrich VLM zones first, then add
        // fallback supplements).
        const { enrichWithEngine1 } = await import('../tvi/enrichment.js');
        const enriched = enrichWithEngine1(
          pairValidated as any,
          // DXYZone has no `pair` field — stamp it so the enrichment's
          // ez.pair === vz.pair match gate fires for this pair's zones.
          pairEngine1Zones.map((z) => ({ ...z, pair })) as any,
          { 'DXY': 0.01, default: 0.0001 } as any,
        );
        pairValidated.length = 0;
        pairValidated.push(...(enriched as any));

        // ── W7 SCAFFOLD INTEGRATION (NEXT_STEPS §1 / CODEX §11) ──
        // The deterministic candidate ladder is the PRIMARY zone-identity set.
        // Verdict zones (vz.verdict set by the ZIP parser) annotate rung
        // freshness; matched rungs absorb their verdict zones (no duplicates).
        // REJECTED verdicts remove the rung from entry candidacy (pass-through).
        {
          const scaffoldRungs = ctx.scaffoldByPair?.[pair] ?? [];
          const SCAFFOLD_TOL = 3 * pipVal; // same tolerance as the scaffold dedup
          const verdictZones = pairValidated.filter((v: any) => v.verdict === 'CONFIRMED' || v.verdict === 'WEAK' || v.verdict === 'REJECTED');
          const legacyZones = pairValidated.filter((v: any) => !v.verdict);
          const matchedVerdictZones = new Set<any>();
          const absorbedLegacy = new Set<any>();
          let scaffoldConfirmed = 0, scaffoldUnverified = 0, scaffoldRejected = 0;

          const matchesRung = (v: any, rung: any): boolean => {
            const mid = ((v.top as number) + (v.bottom as number)) / 2;
            return mid >= rung.bottom - SCAFFOLD_TOL && mid <= rung.top + SCAFFOLD_TOL;
          };

          for (const rung of scaffoldRungs) {
            // 1. REJECTED verdict on this rung → pass-through (not an entry anchor)
            const rejecter = verdictZones.find((v: any) => v.verdict === 'REJECTED' && !matchedVerdictZones.has(v) && matchesRung(v, rung));
            if (rejecter) {
              matchedVerdictZones.add(rejecter);
              scaffoldRejected++;
              log.info(`[W7-SCAFFOLD] ${pair} rung ${rung.id} REJECTED by agent — pass-through (Law 14): ${rejecter.visualEvidence}`);
              continue;
            }
            // 2. CONFIRMED/WEAK verdict → SCAFFOLD_CONFIRMED (agent freshness annotates the rung)
            const confirmer = verdictZones.find((v: any) => (v.verdict === 'CONFIRMED' || v.verdict === 'WEAK') && !matchedVerdictZones.has(v) && matchesRung(v, rung));
            if (confirmer) {
              matchedVerdictZones.add(confirmer);
              pairValidated.push({
                pair,
                type: rung.type,
                top: rung.top,
                bottom: rung.bottom,
                timeframe: rung.timeframe,
                classification: confirmer.classification ?? rung.classification,
                source: 'SCAFFOLD_CONFIRMED',
                verdict: confirmer.verdict,
                mappedIPZoneName: rung.evidence,
                confidence: confirmer.verdict === 'WEAK' ? Math.min(confirmer.confidence ?? 55, 55) : (confirmer.confidence ?? 70),
                reactionCount: rung.reactionCount,
                liquidityScore: rung.liquidityScore,
                confluence: rung.confluence,
                zfp: rung.zfp,
                visualEvidence: confirmer.visualEvidence,
                sourceScreenshot: confirmer.sourceScreenshot,
                scaffoldRungId: rung.id,
              } as any);
              scaffoldConfirmed++;
              continue;
            }
            // 3. Legacy (non-verdict) VLM zone at this level → absorb as SCAFFOLD_CONFIRMED
            const legacyMatch = legacyZones.find((v: any) => !absorbedLegacy.has(v) && matchesRung(v, rung));
            if (legacyMatch) {
              absorbedLegacy.add(legacyMatch);
              pairValidated.push({
                pair,
                type: rung.type,
                top: rung.top,
                bottom: rung.bottom,
                timeframe: rung.timeframe,
                classification: legacyMatch.classification ?? rung.classification,
                source: 'SCAFFOLD_CONFIRMED',
                mappedIPZoneName: rung.evidence,
                confidence: legacyMatch.confidence ?? 70,
                reactionCount: rung.reactionCount,
                liquidityScore: rung.liquidityScore,
                confluence: rung.confluence,
                zfp: rung.zfp,
                visualEvidence: legacyMatch.visualEvidence,
                sourceScreenshot: legacyMatch.sourceScreenshot,
                scaffoldRungId: rung.id,
              } as any);
              scaffoldConfirmed++;
              continue;
            }
            // 4. No verdict, no legacy match → SCAFFOLD_UNVERIFIED (deterministic backbone, honest)
            pairValidated.push({
              pair,
              type: rung.type,
              top: rung.top,
              bottom: rung.bottom,
              timeframe: rung.timeframe,
              classification: rung.classification,
              source: 'SCAFFOLD_UNVERIFIED',
              mappedIPZoneName: rung.evidence,
              confidence: 40,
              reactionCount: rung.reactionCount,
              liquidityScore: rung.liquidityScore,
              confluence: rung.confluence,
              zfp: rung.zfp,
              visualEvidence: `scaffold ${rung.source}: ${rung.evidence}`,
              sourceScreenshot: pairScreenshot?.path || '',
              scaffoldRungId: rung.id,
            } as any);
            scaffoldUnverified++;
          }

          // 5. Remove matched/absorbed zones and ALL REJECTED verdict zones from the
          //    VLM candidate list (matched rungs carry their identity; rejected
          //    levels are pass-through statements, not entries). Unmatched
          //    CONFIRMED/WEAK verdict zones stay (off-scaffold finds → VLM_NEW path).
          for (let i = pairValidated.length - 1; i >= 0; i--) {
            const v = pairValidated[i] as any;
            if (matchedVerdictZones.has(v) || absorbedLegacy.has(v)) pairValidated.splice(i, 1);
            else if (v.verdict === 'REJECTED') {
              log.info(`[W7-SCAFFOLD] ${pair} off-scaffold REJECTED level ${v.bottom}-${v.top} — pass-through, not a candidate`);
              pairValidated.splice(i, 1);
            }
          }
          log.info(`[W7-SCAFFOLD] ${pair}: ${scaffoldRungs.length} rungs → ${scaffoldConfirmed} CONFIRMED + ${scaffoldUnverified} UNVERIFIED + ${scaffoldRejected} REJECTED (pass-through)`);
        }

        let ipAdded = 0;
        for (const ez of pairEngine1Zones) {
          // Skip if VLM already identified this zone (dedup by price overlap)
          const dup = pairValidated.some(v =>
            Math.abs((v as any).top - ez.ceiling) < 0.001 &&
            Math.abs((v as any).bottom - ez.floor) < 0.001
          );
          if (dup) continue;

          // W7 double-feed dedup: a scaffold rung derived from THIS SAME
          // Engine-1 level has DIFFERENT boundaries (pillar rung = ±2 pips,
          // fallback IP zone = +10-pip ceiling — engine:424-425 vs
          // ladder-scaffold:285-286), so the exact-boundary check above
          // misses it. The same level then enters TWICE (rung + fallback)
          // and generates TWO setups with distinct geomSigs — the DXY=21
          // double-feed (W7 container test 1: 10 fallback + 11 scaffold).
          // Proximity dedup: skip when a scaffold candidate already covers
          // this level (midpoint within 3 pips — the scaffold's own dedup
          // tolerance). Genuinely uncovered fallback zones still enter
          // (coverage gaps carry honest FALLBACK_IP_EDGE provenance).
          const ezMid = (ez.ceiling + ez.floor) / 2;
          const coveredByScaffold = pairValidated.some((v: any) => {
            const src = v.source as string;
            if (src !== 'SCAFFOLD_CONFIRMED' && src !== 'SCAFFOLD_UNVERIFIED') return false;
            const vMid = ((v.top as number) + (v.bottom as number)) / 2;
            return Math.abs(vMid - ezMid) < 3 * pipVal;
          });
          if (coveredByScaffold) continue;

          // LQZ-identity preservation: an Engine-1 LQZ must NOT be relabeled
          // as a plain IP supply/demand edge — it keeps LIQUIDITY type and
          // FALLBACK_LQZ provenance (never VLM_CONFIRMED).
          const isLqzFallback = ez.sdOverlap === 'LQZ' || (ez.zoneName?.includes('LQZ') ?? false);
          pairValidated.push({
            pair,
            type: isLqzFallback ? 'LIQUIDITY' : (ez.ceiling > spot ? 'SUPPLY' : 'DEMAND'),
            top: ez.ceiling,
            bottom: ez.floor,
            timeframe: '4H',
            classification: ez.sdType === 'BoM' ? 'BoM' : ez.sdType === 'MoM' ? 'MoM' : 'UNMITIGATED',
            source: isLqzFallback ? 'FALLBACK_LQZ' : 'FALLBACK_IP_EDGE',
            mappedIPZoneName: ez.zoneName || '',
            confidence: 50,
            reactionCount: ez.reactionCount ?? 0,
            liquidityScore: ez.liquidityScore ?? 0,
            visualEvidence: `Engine 1 ${ez.zoneName}: ${ez.reactionCount} reactions, confluence ${ez.confluence}`,
            sourceScreenshot: pairScreenshot?.path || '',
          } as any);
          ipAdded++;
        }

        // ── Smart pair-skip (spec §5.1): skip ONLY if the pair has insufficient
        // TOTAL candidates of any honest provenance (VLM + Engine-1 fallback).
        const totalCandidates = pairValidated.length;
        if (totalCandidates < 3) {
          log.info(`[setups] ${pair}: only ${totalCandidates} total candidates (VLM + Engine-1) — need ≥3. Skipping pair.`);
          continue;
        }
        const vlmCount = pairValidated.filter(v => {
          const src = (v as any).source as string;
          // Enrichment may suffix VLM sources with '_LQZ' (TVI §6.4) — still VLM.
          return src === 'VLM_CONFIRMED' || src === 'VLM_NEW' ||
                 src === 'VLM_CONFIRMED_LQZ' || src === 'VLM_NEW_LQZ' ||
                 src === 'SCAFFOLD_CONFIRMED';
        }).length;
        if (vlmCount === 0) {
          log.info(`[setups] ${pair}: proceeding on ${totalCandidates} Engine-1 candidates (VLM thin — honest FALLBACK_IP_EDGE provenance)`);
        }
        log.info(`setups ${pair}: ${pairValidated.length} total zones (${vlmCount} VLM + ${ipAdded} IP) — spot=${spot}`);

        // ATR(14) in pips from harvested 1H bars — scales the generator's
        // zone distance cap (max(300, atrPips×4)). GBP/AUD need ATR-scaled reach.
        const pairAtrPips = computeATR14Pips(ctx.harvestData?.ohlcByPairTf?.[pair]?.['1H'] ?? [], pipVal);

        // C2 (v4.3 cleanup): day-bucketed 1H bars for the reaction-validity gate.
        // weekStart Monday 00:00 UTC → Monday=+0d … Friday=+4d. Each setup
        // candidate must be reachable from its day's ACTUAL bars (entry band
        // touch) — the slop-killer that replaces the geometry fingerprint.
        const rvAnchor = buildTemporalAnchor(args.weekStart);
        const RV_DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const bars1HForPair = ctx.harvestData?.ohlcByPairTf?.[pair]?.['1H'] ?? [];
        const bars1HByDay: Record<string, OHLCBar[]> = {};
        for (let i = 0; i < RV_DAY_ORDER.length; i++) {
          const dayStart = rvAnchor.weekStartMs + i * 86_400_000;
          const dayEnd = dayStart + 86_400_000;
          bars1HByDay[RV_DAY_ORDER[i]!] = bars1HForPair.filter((b) => b.timestamp >= dayStart && b.timestamp < dayEnd);
        }

        // priorWeekMomentum from harvest: last 40 4H bars ≈ 1 week (Bible Law 29 — prior week context).
        // (lastClose − firstClose) / firstClose × 100: > +0.5% BULLISH, < −0.5% BEARISH, else NEUTRAL.
        const bars4H = ctx.harvestData?.ohlcByPairTf?.[pair]?.['4H'] ?? [];
        const priorWeekBars = bars4H.slice(-40);
        let priorWeekMomentum: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (priorWeekBars.length >= 2) {
          const first = priorWeekBars[0].close;
          const last = priorWeekBars[priorWeekBars.length - 1].close;
          const pctChange = ((last - first) / first) * 100;
          if (pctChange > 0.5) priorWeekMomentum = 'BULLISH';
          else if (pctChange < -0.5) priorWeekMomentum = 'BEARISH';
        }

        // ── s2.8 RC-3 (the W7 wave): THE PROJECTION ANCHORS FEED THE SETUP
        //    RESOLUTION — this pair's STEP B projections are injected as
        //    PROJECTION_ANCHOR candidates (the entry band centered on the
        //    projection's E). The generator's setup resolution then builds ON
        //    the STEP B output — the T1 law ("the next tool's arguments MUST
        //    contain the output of that reasoning"; the context carries the
        //    projections, the E3 resolves them). Contract-violating projections
        //    were excluded at the tool-entry check above; non-finite anchors
        //    are skipped here (never injected). The projection's setupId + the
        //    E/SL/TP ride the evidence for the honest provenance trace. ──
        const pairProjections = stepBProjections.filter((p) => p.pair === pair);
        for (const proj of pairProjections) {
          if (!Number.isFinite(proj.E) || proj.E <= 0) continue;
          pairValidated.push({
            pair,
            type: proj.direction === 'LONG' ? 'DEMAND' : 'SUPPLY',
            top: proj.E + pipVal * 3,
            bottom: proj.E - pipVal * 3,
            timeframe: '4H',
            classification: proj.direction === 'LONG' ? 'MoM' : 'MoM',
            source: 'PROJECTION_ANCHOR',
            confidence: Math.round(Math.min(100, Math.max(0, (proj.confidence ?? 0.5) * 100))),
            reactionCount: 0,
            liquidityScore: 0,
            visualEvidence: `STEP B projection ${proj.setupId}: E ${proj.E.toFixed(5)} SL ${proj.SL.toFixed(5)} TP ${proj.TP.toFixed(5)}`,
            sourceScreenshot: pairScreenshot?.path || '',
          } as any);
        }
        if (pairProjections.length > 0) {
          log.info(`setups STEP B: ${pair} — ${pairProjections.length} STEP B projection anchor(s) consumed (the E3 resolves the STEP B output)`);
        }

        // REAL API: generateSetups takes individual params, NOT a combined object
        // W6-3: pass the pair's OWN shape chain (dedicated data, dedicated chain)
        // plus the injected DXY macro bias for the cascade (Part 6.5). DXY itself
        // gets no injection — its cascade is native.
        const setups = generator.generateSetups(
          ctx.zoneMapSnapshot,        // zoneMap: ZoneMapSnapshot
          ctx.shapeByPair?.[pair] ?? ctx.shapeSnapshot,  // shapePrediction: THIS pair's own chain
          pairValidated as any,       // visualZones: VisualSDZone[]
          pair,                       // pair: string
          spot,                       // spot: number
          setupCounter,               // setupCounter: number
          priorWeekMomentum,          // priorWeekMomentum (computed from harvest 4H bars above)
          pairAtrPips,                // atr: pair ATR(14) in pips
          { dxyMacroBias: pair === 'DXY' ? undefined : (ctx.dxyMacroBias ?? undefined), bars1HByDay },
        );

        allSetups.push(...setups);
        setupCounter++;
      }

      // ── v4.4 MDVE + MIRROR STAGE (§8/§9 — deterministic floor + §8.1
      //    anchor-gated emergent surplus). ADDITIVE + FAIL-SAFE: this whole
      //    block is wrapped so ANY failure (missing models, MDVE throw)
      //    leaves allSetups exactly as the emergent lane produced it — the
      //    report always ships (VEI philosophy: log prominently, never
      //    silently pass, never break the pipeline). Zero pixels, zero LLM.
      const emergentOnlyCount = allSetups.length;
      try {
        const { runMirrorStageV45, anchorGateEmergent, commonSenseGateEmergent, mergeMirrorWithEmergent, buildStageSummary } =
          await import('./mdve-stage.js');
        const stageCtx = {
          weekStart: ctx.weekStart,
          harvestData: {
            ohlcByPairTf: ctx.harvestData?.ohlcByPairTf ?? {},
            spots: ctx.harvestData?.spots ?? {},
          },
          scaffoldByPair: ctx.scaffoldByPair,
          chartModelsByPair: ctx.chartModelsByPair,
        };
        const stage = runMirrorStageV45(stageCtx);
        if (stage.lane !== 'v4.5') {
          log.info(`⚠ MDVE v4.5 lane DEGRADED to ${stage.lane} — the v4.4 lane carries the floor (fail-safe; the report ships)`);
        }
        // The f(T) firewall + §11 mirror-floor evaluation — ALWAYS logged,
        // violations PROMINENT (never silently passed).
        for (const line of stage.firewallLog) log.info(line);
        if (stage.ran) {
          if (stage.floor && !stage.floor.ok) {
            log.info(`⚠⚠⚠ MIRROR-FLOOR VIOLATION (§11) — ${stage.floor.violations.length} contract breach(es); evidence logged above; the report proceeds with the honest counts (fail-open doctrine: NEVER silently pass)`);
          }
          // §8.1 anchor gate: the emergent lane's passive-level slop-killer.
          const gate = anchorGateEmergent(allSetups, stageCtx);
          for (const line of gate.log) log.info(line);
          // v4.5 common-sense gate (§6 CS-1 + §7 narrative): kills the
          // structurally-un-enterable + counter-narrative survivors.
          const csGate = commonSenseGateEmergent(gate.kept, stageCtx);
          for (const line of csGate.log) log.info(line);
          const gateAll = {
            kept: csGate.kept,
            dropped: [...gate.dropped, ...csGate.dropped],
            log: [...gate.log, ...csGate.log],
          };
          // Merge: mirror floor (primary) + gated emergent (surplus),
          // deduped by the §8.4 corrected identity (zone+day+session).
          const { merged, duplicatesDropped } = mergeMirrorWithEmergent(stage.mirrorSetups, csGate.kept);
          log.info(
            `MDVE merge: ${stage.mirrorSetups.length} floor (${stage.dxySource.length} DXY source + ${stage.mirrorSetups.length - stage.dxySource.length} ACTIVE mirrors) ` +
            `+ ${csGate.kept.length} anchor+CS-gated emergent (${emergentOnlyCount - csGate.kept.length} passive/unbattled/CS-killed dropped of ${emergentOnlyCount}) ` +
            `− ${duplicatesDropped} cross-lane duplicates = ${merged.length} total`,
          );
          allSetups.length = 0;
          allSetups.push(...merged);
          ctx.mdveStage = buildStageSummary(stage, emergentOnlyCount, gateAll, duplicatesDropped, merged.length);
        } else {
          log.info(`MDVE stage UNAVAILABLE (${stage.failureReason}) — emergent-only output (${emergentOnlyCount} setups, fail-safe)`);
        }
      } catch (e) {
        // FAIL-SAFE: the MDVE stage NEVER breaks the report. allSetups is
        // untouched unless the merge already succeeded (ctx.mdveStage set).
        log.info(`MDVE stage FAILED (non-fatal — emergent-only output preserved): ${e instanceof Error ? e.message : String(e)}`);
        if (!ctx.mdveStage) {
          // The merge never committed — guarantee the emergent lane's
          // output is intact (defensive: allSetups is only mutated AFTER a
          // successful merge above, so this is a no-op by construction).
        }
      }

      // ── s2.8 RC-6 (the W7 wave): THE PLACEMENT — the "close the charts"
      //    clause. The STEP B projections have RESOLVED into the final setup
      //    set (the per-pair generation + the mirror merge above). The run is
      //    now PLACED: any E2 (shapes) / E3 (setups) re-entry throws
      //    FROZEN_SNAPSHOT via assertNotPlaced — the pipeline NEVER recomputes
      //    post-order (the operator's workflow: "the prices action just fills
      //    my limit orders and hits TP/SL accordingly").
      ctx.placed = true;
      log.info('setups: the run is PLACED — the pipeline does not recompute post-order (the frozen-snapshot clause)');

      // Write report using the NEW clean MD report generator
      let reportPath = '';
      try {
        const { writeMdReport } = await import('../report/md-report-generator.js');
        reportPath = `/root/plutus/reports/TTE_Report_${ctx.weekStart}.md`;
        writeMdReport({
          weekStart: ctx.weekStart,
          setups: allSetups,
          zoneMapSnapshot: ctx.zoneMapSnapshot,
          shapeSnapshot: ctx.shapeSnapshot,
          shapeByPair: ctx.shapeByPair,   // W6-3: per-pair chains for the FX shape-chain sections
          harvestData: ctx.harvestData as any,
          screenshots: ctx.screenshots || [],
          mirror: ctx.mdveStage,          // v4.4: Section 26 (MDVE mirror cascade) — omitted when the stage didn't run
        }, reportPath);
        log.info(`Report written to ${reportPath}`);
      } catch (e) {
        log.info(`Report generation failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
      }

      const totalDuration = Date.now() - ctx.startedAt;
      const fatalErrorCount = ctx.errors.filter((e) => e.severity === 'FATAL').length;

      log.info(`setups DONE: ${allSetups.length} setups, ${fatalErrorCount} FATAL, ${totalDuration}ms`);

      const result = {
        status: fatalErrorCount === 0 ? 'success' : 'PARTIAL',
        reportPath,
        setupCount: allSetups.length,
        setupsPerPair: pairs.map((p) => ({
          pair: p,
          count: allSetups.filter((s) => s.pair === p).length,
        })),
        validatedZoneCount: validZones.length,
        fatalErrorCount,
        durationMs: totalDuration,
        durationMinutes: (totalDuration / 60_000).toFixed(1),
        pipelineVersion: '4.0.0',
        // v4.5.4 Phase 7: the D5 chain's NEXT — the gate tool is the terminal
        // tool (it calls resetContext(); setups must NOT reset, or the gate
        // would lose the projections in the context).
        nextStep: 'NEXT: call plutus-pipeline-gate with weekStart — the W6 golden gate runs the G1-G10 verdicts and resets the pipeline context.',
        // v4.4 MDVE+mirror stage outcome (null when the stage didn't run —
        // the fail-safe emergent-only path).
        mdve: ctx.mdveStage ? {
          ran: true,
          dxySource: ctx.mdveStage.dxySourceCount,
          euActive: ctx.mdveStage.euActive,
          guActive: ctx.mdveStage.guActive,
          casualties: ctx.mdveStage.casualties.length,
          mirrorFloorOk: ctx.mdveStage.floorOk,
          mirrorFloorViolations: ctx.mdveStage.floorViolations,
          emergentBefore: ctx.mdveStage.emergentBefore,
          emergentAfterGate: ctx.mdveStage.emergentAfterGate,
          passiveSlopDropped: ctx.mdveStage.passiveSlopDropped,
          duplicatesDropped: ctx.mdveStage.duplicatesDropped,
          mergedTotal: ctx.mdveStage.mergedTotal,
        } : { ran: false },
      };

      // v4.5.4 Phase 7: the T1 lifecycle reset MOVED to the gate tool — the
      // terminal tool of the D5 chain (spec §7.4). Setups must NOT reset the
      // context here: the gate tool reads ctx.projections (the STEP B output)
      // for the G1-G10 verdicts. A reset here would lose them.
      return {
        title: `Pipeline COMPLETE — ${allSetups.length} setups`,
        output: JSON.stringify(result, null, 2),
      };
    } catch (e) {
      const err = toPipelineError(e, 'plutus-pipeline-setups', 'ALL');
      ctx.errors.push(err);
      return {
        title: 'Setups FAILED',
        output: JSON.stringify({ status: 'FATAL', error: err.message }),
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL: plutus-browse-screenshot — Protocol A options-table extractor (W6-5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PLUTUS_IMAGE_VALIDATION_PROMPT — MiMo VALID/INVALID firewall gate.
 * The screenshot NEVER reaches the zones firewall unless MiMo confirms it is
 * a usable FX OTC options expiry table. INVALID → [NO DATA] (declared outcome).
 */
const PLUTUS_IMAGE_VALIDATION_PROMPT =
  'You are a strict data-validation gate inside a trading pipeline. Judge ONE image: ' +
  'is it a usable FX OTC options expiry table from investinglive.com? ' +
  'VALID requires ALL of: (1) A table of FX option expiries: currency pairs, strike prices, ' +
  'notional amounts. (2) The table is the MAIN subject — not cropped, not covered by ' +
  'popups/ads/nav. (3) Rows are legible: pair + strike + notional readable. ' +
  'INVALID if ANY of: homepage without table; CloudFront/403/error page; login wall; ' +
  'chart; article text; header/footer; blank; illegible. ' +
  'Reply with EXACTLY one word on line 1: VALID or INVALID. ' +
  'If INVALID, add ONE line under 80 characters: the reason and corrective action. No other output.';

const plutusBrowseScreenshot = tool({
  description:
    'Protocol A options-table extractor (Decision 23: the tool OWNS the flow — NO fallbacks). ' +
    'Flow: Orders index (investinglive.com/Orders/) → find the fx-option-expiries-for- link ' +
    'matching this week\'s Friday YYYYMMDD token → navigate to the date page AS LINKED IN THE DOM ' +
    '→ locate the options table image (FXO/size900) → element-clipped 2x screenshot → MiMo VALID/INVALID firewall. ' +
    'Returns a firewall-verified screenshotPath, OR declares [NO DATA] ' +
    '(then call plutus-pipeline-zones with optionsData: [] — structural pillars only). ' +
    'Do NOT pass a URL. Do NOT navigate yourself. Pass weekStart only.',
  args: {
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('ISO Monday date for the target week (same weekStart as harvest). The tool derives the Friday YYYYMMDD token itself.'),
  },
  async execute(args): Promise<ToolResult> {
    // ── Protocol A constants — derived from the temporal anchor, never from a URL arg ──
    const anchor = buildTemporalAnchor(args.weekStart);
    const dateToken = anchor.fridayCompact;                       // "20260710"
    const indexUrl = 'https://investinglive.com/Orders/';         // Protocol A entry point
    const hrefPattern = 'fx-option-expiries-for-';
    const screenshotPath = `/tmp/plutus_options_${anchor.fridayIso}.jpeg`;
    log.info(`browse-screenshot Protocol A START: weekStart=${args.weekStart}, friday=${anchor.fridayIso}, token=${dateToken}`);

    // ── CDP CONNECT — infrastructure failure here is FATAL (browser down), not [NO DATA] ──
    const CDP_PORT = 6930;
    const CDP_HOST = '127.0.0.1';
    const cdpBase = `http://${CDP_HOST}:${CDP_PORT}`;
    let ws: WebSocket;
    let sendCdp: (method: string, params?: any) => Promise<any>;
    let tabId: string | null = null;
    try {
      const resp = await fetch(`${cdpBase}/json/new?${encodeURIComponent(indexUrl)}`, { method: 'PUT' });
      if (!resp.ok) throw new Error(`CDP tab creation failed: HTTP ${resp.status}`);
      const tab = await resp.json() as { id: string; webSocketDebuggerUrl?: string };
      tabId = tab.id;
      if (!tab.webSocketDebuggerUrl) throw new Error('CDP tab response missing webSocketDebuggerUrl');
      const wsUrl = tab.webSocketDebuggerUrl.replace('localhost', CDP_HOST).replace('127.0.0.1', CDP_HOST);
      ws = new WebSocket(wsUrl);
      let msgId = 0;
      const pending = new Map<number, (data: any) => void>();
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)!(msg);
            pending.delete(msg.id);
          }
        } catch {}
      };
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 10_000);
      });
      sendCdp = (method: string, params: any = {}): Promise<any> => {
        return new Promise((resolve, reject) => {
          const id = ++msgId;
          pending.set(id, (msg) => {
            if (msg.error) reject(new Error(JSON.stringify(msg.error)));
            else resolve(msg.result);
          });
          ws.send(JSON.stringify({ id, method, params }));
          setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, 30_000);
        });
      };
      await sendCdp('Page.enable');
      await sendCdp('Runtime.enable');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      log.info(`browse-screenshot FATAL (CDP infrastructure): ${errMsg}`);
      return {
        title: 'Screenshot FAILED — browser unreachable',
        output: JSON.stringify({ status: 'FATAL', error: errMsg, hint: 'Ensure Chrome CDP is running on :6930. Use bash to check: curl -s http://127.0.0.1:6930/json/version' }),
      };
    }

    // Poll-based wait — Cloudflare challenges and lazy renders defeat fixed sleeps (bug 2).
    const waitFor = async (expression: string, timeoutMs: number): Promise<boolean> => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try {
          const r = await sendCdp('Runtime.evaluate', { expression, returnByValue: true });
          if (r?.result?.value) return true;
        } catch { /* page mid-navigation — retry */ }
        await new Promise((r) => setTimeout(r, 750));
      }
      return false;
    };

    try {
      // ── STAGE NAVIGATE_ORDERS ── tab opened on the Orders index above; wait
      // until the expiry anchors exist in the DOM (Cloudflare challenge may delay this).
      const indexReady = await waitFor(
        `document.querySelectorAll('a[href*="${hrefPattern}"]').length > 0`,
        25_000,
      );
      if (!indexReady) {
        throw new Error('[NAVIGATE_ORDERS] Orders index never rendered expiry links (Cloudflare block or site change)');
      }
      // Cookie consent (REJECT) — best effort, non-fatal.
      await sendCdp('Runtime.evaluate', {
        expression: `(() => { const b=[...document.querySelectorAll('button, a')].find(x=>/reject|decline/i.test(x.textContent||'')); if(b){b.click(); return 'clicked';} return null; })()`,
        returnByValue: true,
      }).catch(() => null);

      // ── STAGE FIND_DATE_LINK ── href extraction from live DOM + YYYYMMDD match.
      // NEVER construct the date URL by guessing (the deterministic permalink
      // below is a ONE-SHOT historical probe, not a fallback chain).
      const hrefRes = await sendCdp('Runtime.evaluate', {
        expression: `JSON.stringify([...document.querySelectorAll('a')].map(a => a.href).filter(h => h.includes('${hrefPattern}')))`,
        returnByValue: true,
      });
      const hrefs: string[] = JSON.parse(hrefRes?.result?.value || '[]');
      let datePageUrl = hrefs.find((h) => h.includes(dateToken));
      let alreadyNavigated = false;

      if (!datePageUrl) {
        // OPTIONAL historical probe: deterministic permalink, attempted ONCE.
        // 404 → [NO DATA]. NEVER "use the most recent 3" (legacy protocol-a-executor:464-466)
        // — that injects a DIFFERENT week's walls into this week's zone map.
        const fridayDate = new Date(`${anchor.fridayIso}T00:00:00Z`);
        const monthName = fridayDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }).toLowerCase();
        const permalink = `https://investinglive.com/Orders/fx-option-expiries-for-${fridayDate.getUTCDate()}-${monthName}-10am-new-york-cut-${dateToken}/`;
        log.info(`FIND_DATE_LINK: no index match for ${dateToken} — probing permalink once: ${permalink}`);
        await sendCdp('Page.navigate', { url: permalink });
        await waitFor(`document.readyState === 'complete'`, 15_000);
        const probeRes = await sendCdp('Runtime.evaluate', {
          expression: `JSON.stringify({ title: document.title || '', body: (document.body?.innerText || '').slice(0, 1500), hasTableImg: !!document.querySelector('img[data-src*="FXO"], img[data-src*="size900"], img[src*="FXO"], img[src*="size900"]') })`,
          returnByValue: true,
        });
        const probe = JSON.parse(probeRes?.result?.value || '{}');
        const is404 = /404|page not found|not be found|doesn't exist/i.test(`${probe.title} ${probe.body}`);
        if (is404 || !probe.hasTableImg) {
          throw new Error(`[FIND_DATE_LINK] NO EXPIRY PAGE for ${anchor.fridayIso}`);
        }
        datePageUrl = permalink;
        alreadyNavigated = true;
      }

      // ── STAGE NAVIGATE_DATE_PAGE ── the href AS FOUND IN THE DOM.
      if (!alreadyNavigated) {
        await sendCdp('Page.navigate', { url: datePageUrl });
        const loaded = await waitFor(
          `document.readyState === 'complete' || document.readyState === 'interactive'`,
          20_000,
        );
        if (!loaded) {
          throw new Error(`[NAVIGATE_DATE_PAGE] date page did not load: ${datePageUrl.substring(0, 90)}`);
        }
      }

      // ── STAGE LOCATE_TABLE ── FXO/size900 selectors first, else largest img
      // in the article. scrollIntoView, then poll (images lazy-load on scroll).
      const FIND_TABLE_EXPR = `(() => {
        let el = document.querySelector('img[data-src*="FXO"], img[data-src*="size900"]')
          || document.querySelector('img[src*="FXO"], img[src*="size900"]');
        if (!el) {
          const content = document.querySelector('.entry-content, article, main, .post-content') || document.body;
          const imgs = content.querySelectorAll('img');
          let largest = null, largestArea = 0;
          for (const im of imgs) {
            const r = im.getBoundingClientRect();
            const area = r.width * r.height;
            if (area > largestArea) { largestArea = area; largest = im; }
          }
          el = largest;
        }
        if (!el) return null;
        try { window.__fxoTarget = el; } catch (e) {}
        try { el.scrollIntoView({ block: 'center', behavior: 'instant' }); }
        catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
        const r = el.getBoundingClientRect();
        return JSON.stringify({ x: r.x, y: r.y, width: r.width, height: r.height });
      })()`;

      let rect: { x: number; y: number; width: number; height: number } | null = null;
      const tableDeadline = Date.now() + 15_000;
      while (Date.now() < tableDeadline && !rect) {
        const r = await sendCdp('Runtime.evaluate', { expression: FIND_TABLE_EXPR, returnByValue: true });
        if (typeof r?.result?.value === 'string') {
          const p = JSON.parse(r.result.value);
          if (p.width >= 50 && p.height >= 30) rect = p;
        }
        if (!rect) await new Promise((res) => setTimeout(res, 1_000));
      }
      if (!rect) {
        throw new Error('[LOCATE_TABLE] no options table image found on date page');
      }
      // Let the lazy-loaded image render, then re-measure (scroll may shift layout).
      await new Promise((r) => setTimeout(r, 2_000));
      const reRect = await sendCdp('Runtime.evaluate', {
        expression: `(() => { const el = window.__fxoTarget; if (!el) return null; const r = el.getBoundingClientRect(); return JSON.stringify({ x: r.x, y: r.y, width: r.width, height: r.height }); })()`,
        returnByValue: true,
      });
      if (typeof reRect?.result?.value === 'string') rect = JSON.parse(reRect.result.value);
      if (!rect) throw new Error('[LOCATE_TABLE] table element lost after re-measure');
      const clipRect: { x: number; y: number; width: number; height: number } = rect;

      // ── STAGE SCREENSHOT ── element-clipped capture at 2x scale (table text
      // must stay legible for the firewall and the agent's own extraction).
      const shot = await sendCdp('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 80,
        clip: { x: clipRect.x, y: clipRect.y, width: clipRect.width, height: clipRect.height, scale: 2 },
      });
      if (!shot?.data) throw new Error('[SCREENSHOT] Page.captureScreenshot returned no data');
      const { writeFile } = await import('node:fs/promises');
      await writeFile(screenshotPath, Buffer.from(shot.data, 'base64'));
      log.info(`SCREENSHOT: element clip ${Math.round(clipRect.width)}x${Math.round(clipRect.height)} @2x → ${screenshotPath}`);

      // ── STAGE FIREWALL ── MiMo VALID/INVALID gate. INVALID → [NO DATA].
      const { vlmInfer } = await import('../engine/data-source-router.js');
      const verdict = await vlmInfer(screenshotPath, PLUTUS_IMAGE_VALIDATION_PROMPT);
      if (!verdict) throw new Error('[FIREWALL] VLM gate unavailable — cannot validate screenshot');
      const firstLine = verdict.split('\n')[0].trim().toUpperCase();
      if (firstLine.startsWith('INVALID')) {
        const reason = (verdict.split('\n')[1] ?? 'no reason given').trim().slice(0, 80);
        throw new Error(`[FIREWALL] ${reason}`);
      }
      if (!firstLine.startsWith('VALID')) {
        throw new Error('[FIREWALL] unparseable verdict — treating as INVALID');
      }
      log.info('FIREWALL: VALID — screenshot cleared for Manual Step A extraction');

      // ── Built-in OCR (non-fatal) — the agent must NOT run OCR itself. ──
      let ocrText = '';
      try {
        const { execFile } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(execFile);
        const resizedPath = screenshotPath.replace('.jpeg', '_small.jpeg');
        const ocrScript = `
from PIL import Image
import pytesseract, sys
img = Image.open(sys.argv[1])
if img.width > 800:
    ratio = 800 / img.width
    img = img.resize((800, int(img.height * ratio)), Image.LANCZOS)
img.save(sys.argv[2], 'JPEG', quality=75)
text = pytesseract.image_to_string(img)
print(text)
`;
        const { stdout: ocrOut } = await execAsync('python3', ['-c', ocrScript, screenshotPath, resizedPath], { timeout: 30_000 });
        ocrText = ocrOut.trim();
        log.info(`browse-screenshot: OCR extracted ${ocrText.length} chars`);
      } catch (ocrErr) {
        log.info(`browse-screenshot: OCR failed (non-fatal): ${ocrErr instanceof Error ? ocrErr.message : String(ocrErr)}`);
      }

      log.info(`browse-screenshot Protocol A DONE: ${screenshotPath}`);
      return {
        title: `Protocol A VALID — options table captured (${anchor.fridayIso})`,
        output: JSON.stringify({
          status: 'success',
          screenshotPath,
          datePageUrl,
          fridayIso: anchor.fridayIso,
          firewall: 'VALID',
          ocrText: ocrText.length > 0 ? ocrText : undefined,
          instruction: 'FIREWALL-VERIFIED options table. Read() the screenshotPath DIRECTLY and extract pair, strike, notional per row (bold flag if the row is bolded). Then call plutus-pipeline-zones with optionsData — set sourceScreenshot to this screenshotPath in EVERY entry. Do NOT run OCR yourself; use your own vision.',
        }),
      };
    } catch (e) {
      // Protocol stage failure → [NO DATA] is a DECLARED OUTCOME (Decision 23),
      // not an error. The pipeline proceeds with structural pillars only.
      const msg = e instanceof Error ? e.message : String(e);
      const stage = msg.match(/^\[([A-Z_]+)\]/)?.[1] ?? 'UNKNOWN';
      log.info(`browse-screenshot [NO DATA] stage=${stage}: ${msg}`);
      return {
        title: `Protocol A [NO DATA] — ${stage}`,
        output: JSON.stringify({
          status: 'NO_DATA',
          declaredOutcome: '[NO DATA]',
          stage,
          error: msg,
          fridayIso: anchor.fridayIso,
          instruction: 'Protocol A declared [NO DATA] — proceed to plutus-pipeline-zones with optionsData: [] (structural pillars only). NEVER fabricate options data and NEVER substitute a different week.',
        }),
      };
    } finally {
      try { ws.close(); } catch {}
      if (tabId) {
        try { await fetch(`${cdpBase}/json/close/${tabId}`); } catch {}
      }
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL: plutus-backtest-setups — Verify setups against actual OHLC data
// ═══════════════════════════════════════════════════════════════════════════════

const TV_DATAFEED_MAP: Record<string, { symbol: string; exchange: string }> = {
  DXY: { symbol: 'DXY', exchange: 'TVC' },
  'EUR/USD': { symbol: 'EURUSD', exchange: 'FX' },
  EURUSD: { symbol: 'EURUSD', exchange: 'FX' },
  'GBP/USD': { symbol: 'GBPUSD', exchange: 'FX' },
  GBPUSD: { symbol: 'GBPUSD', exchange: 'FX' },
  'AUD/USD': { symbol: 'AUDUSD', exchange: 'FX' },
  AUDUSD: { symbol: 'AUDUSD', exchange: 'FX' },
};

function normalizePairCanonical(pair: string): string {
  const upper = pair.toUpperCase().replace(/[\s_-]/g, '');
  const CANON: Record<string, string> = {
    EURUSD: 'EUR/USD',
    GBPUSD: 'GBP/USD',
    AUDUSD: 'AUD/USD',
    DXY: 'DXY',
  };
  return CANON[upper] ?? pair;
}

function dayToUtcRange(day: string, weekStartMs: number): { startMs: number; endMs: number } {
  const DAY_OFFSETS: Record<string, number> = {
    monday: 0, mon: 0,
    tuesday: 1, tue: 1, tues: 1,
    wednesday: 2, wed: 2,
    thursday: 3, thu: 3, thur: 3, thurs: 3,
    friday: 4, fri: 4,
    saturday: 5, sat: 5,
    sunday: 6, sun: 6,
  };
  const MS_PER_DAY = 86_400_000;
  const offset = DAY_OFFSETS[day.toLowerCase()] ?? 0;
  return {
    startMs: weekStartMs + offset * MS_PER_DAY,
    endMs: weekStartMs + (offset + 1) * MS_PER_DAY,
  };
}

const plutusBacktestSetups = tool({
  description:
    'Backtest trade setups against actual OHLC data from tvDatafeed. ' +
    'Fetches 1H bars for the target week, checks whether each setup\'s entry was triggered, ' +
    'and determines if TP or SL was hit first. Returns a full backtest report with win rate, ' +
    'total pips, and per-setup results.',
  args: {
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('ISO Monday date for the target week (e.g. "2026-07-06")'),
    setups: z
      .array(
        z.object({
          setupId: z.string(),
          pair: z.string(),
          direction: z.string(),
          entry: z.number(),
          sl: z.number(),
          tp: z.number(),
          day: z.string(),
        }),
      )
      .min(1)
      .describe('Trade setups to backtest'),
  },
  async execute(args): Promise<ToolResult> {
    log.info(`backtest START: weekStart=${args.weekStart}, setups=${args.setups.length}`);

    try {
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execFileAsync = promisify(execFile);

      const uniquePairs = [...new Set(args.setups.map((s) => normalizePairCanonical(s.pair)))];
      const weekStartMs = Date.parse(args.weekStart + 'T00:00:00Z');
      const MS_PER_WEEK = 7 * 86_400_000;
      const weekEndMs = weekStartMs + MS_PER_WEEK;

      log.info(`backtest: fetching 1H bars for ${uniquePairs.length} unique pairs`);

      interface SimpleBar {
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
      }

      const barsByPair: Record<string, SimpleBar[]> = {};
      const fetchErrors: string[] = [];

      await Promise.all(
        uniquePairs.map(async (pair) => {
          const tvMap = TV_DATAFEED_MAP[pair] ?? TV_DATAFEED_MAP[pair.toUpperCase()];
          if (!tvMap) {
            fetchErrors.push(`No tvDatafeed mapping for pair "${pair}"`);
            barsByPair[pair] = [];
            return;
          }

          try {
            const { stdout } = await execFileAsync(
              'python3',
              [
                '/root/scripts/tv_datafeed.py',
                '--symbol', tvMap.symbol,
                '--exchange', tvMap.exchange,
                '--interval', '1_hour',
                '--bars', '500',
              ],
              { timeout: 120_000, maxBuffer: 50 * 1024 * 1024 },
            );

            const allBars = JSON.parse(stdout) as SimpleBar[];
            const weekBars = allBars.filter((b) => b.timestamp >= weekStartMs && b.timestamp < weekEndMs);
            barsByPair[pair] = weekBars.sort((a, b) => a.timestamp - b.timestamp);
            log.info(`backtest ${pair}: ${allBars.length} bars fetched, ${weekBars.length} in target week`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            fetchErrors.push(`${pair}: ${msg}`);
            barsByPair[pair] = [];
            log.info(`backtest ${pair}: FETCH FAILED — ${msg}`);
          }
        }),
      );

      interface BacktestResult {
        setupId: string;
        pair: string;
        direction: string;
        result: 'WIN' | 'LOSS' | 'NOT_TRIGGERED';
        entryBar: string | null;
        exitBar: string | null;
        pips: number;
        details: string;
      }

      const results: BacktestResult[] = [];

      for (const setup of args.setups) {
        const pair = normalizePairCanonical(setup.pair);
        const allBars = barsByPair[pair] ?? [];
        const dirUpper = setup.direction.toUpperCase();
        const isLong = dirUpper.includes('LONG') || dirUpper === 'BUY';
        const isShort = dirUpper.includes('SHORT') || dirUpper === 'SELL';

        if (allBars.length === 0) {
          results.push({
            setupId: setup.setupId, pair: setup.pair, direction: setup.direction,
            result: 'NOT_TRIGGERED', entryBar: null, exitBar: null, pips: 0,
            details: 'No OHLC data available for this pair',
          });
          continue;
        }

        const dayRange = dayToUtcRange(setup.day, weekStartMs);
        const dayBars = allBars.filter((b) => b.timestamp >= dayRange.startMs && b.timestamp < dayRange.endMs);

        if (dayBars.length === 0) {
          results.push({
            setupId: setup.setupId, pair: setup.pair, direction: setup.direction,
            result: 'NOT_TRIGGERED', entryBar: null, exitBar: null, pips: 0,
            details: `No bars found for ${setup.day}`,
          });
          continue;
        }

        const pipValue = PIP_VALUE[pair] ?? 0.0001;

        let entryBarTimestamp = 0;
        let entryTriggered = false;

        for (const bar of dayBars) {
          if (isLong && bar.low <= setup.entry) {
            entryTriggered = true;
            entryBarTimestamp = bar.timestamp;
            break;
          }
          if (isShort && bar.high >= setup.entry) {
            entryTriggered = true;
            entryBarTimestamp = bar.timestamp;
            break;
          }
        }

        if (!entryTriggered) {
          results.push({
            setupId: setup.setupId, pair: setup.pair, direction: setup.direction,
            result: 'NOT_TRIGGERED', entryBar: null, exitBar: null, pips: 0,
            details: `Entry at ${setup.entry} not reached during ${setup.day}`,
          });
          continue;
        }

        const barsAfterEntry = allBars.filter((b) => b.timestamp >= entryBarTimestamp);

        let outcome: 'WIN' | 'LOSS' = 'LOSS';
        let exitPrice = setup.sl;
        let exitBarTimestamp = entryBarTimestamp;
        let exitFound = false;

        for (const bar of barsAfterEntry) {
          if (isLong) {
            if (bar.high >= setup.tp) {
              outcome = 'WIN'; exitPrice = setup.tp; exitBarTimestamp = bar.timestamp; exitFound = true; break;
            }
            if (bar.low <= setup.sl) {
              outcome = 'LOSS'; exitPrice = setup.sl; exitBarTimestamp = bar.timestamp; exitFound = true; break;
            }
          } else if (isShort) {
            if (bar.low <= setup.tp) {
              outcome = 'WIN'; exitPrice = setup.tp; exitBarTimestamp = bar.timestamp; exitFound = true; break;
            }
            if (bar.high >= setup.sl) {
              outcome = 'LOSS'; exitPrice = setup.sl; exitBarTimestamp = bar.timestamp; exitFound = true; break;
            }
          }
        }

        if (!exitFound && barsAfterEntry.length > 0) {
          const lastBar = barsAfterEntry[barsAfterEntry.length - 1];
          if (lastBar) {
            exitPrice = lastBar.close;
            exitBarTimestamp = lastBar.timestamp;
            const profit = isLong ? exitPrice - setup.entry : setup.entry - exitPrice;
            outcome = profit > 0 ? 'WIN' : 'LOSS';
          }
        }

        let pips: number;
        if (outcome === 'WIN') {
          pips = Math.abs(exitPrice - setup.entry) / pipValue;
        } else {
          pips = -Math.abs(setup.entry - exitPrice) / pipValue;
        }

        results.push({
          setupId: setup.setupId, pair: setup.pair, direction: setup.direction,
          result: outcome,
          entryBar: new Date(entryBarTimestamp).toISOString(),
          exitBar: new Date(exitBarTimestamp).toISOString(),
          pips: Math.round(pips),
          details: outcome === 'WIN'
            ? `Entry triggered at ${setup.entry}, TP hit at ${exitPrice}`
            : exitFound
              ? `Entry triggered at ${setup.entry}, SL hit at ${exitPrice}`
              : `Entry triggered at ${setup.entry}, settled at close ${exitPrice}`,
        });
      }

      const triggered = results.filter((r) => r.result !== 'NOT_TRIGGERED').length;
      const wins = results.filter((r) => r.result === 'WIN').length;
      const losses = results.filter((r) => r.result === 'LOSS').length;
      const notTriggered = results.filter((r) => r.result === 'NOT_TRIGGERED').length;
      const totalPips = results.reduce((sum, r) => sum + r.pips, 0);
      const winRate = triggered > 0 ? Math.round((wins / triggered) * 100) + '%' : '0%';

      const report: Record<string, unknown> = {
        totalSetups: results.length, triggered, wins, losses, notTriggered,
        winRate, totalPips, results,
      };
      if (fetchErrors.length > 0) report.dataFetchErrors = fetchErrors;

      log.info(`backtest DONE: ${wins}W/${losses}L/${notTriggered}NT, winRate=${winRate}, totalPips=${totalPips}`);

      return {
        title: `Backtest Complete — ${wins}W/${losses}L/${notTriggered}NT (${winRate} win rate, ${totalPips} pips)`,
        output: JSON.stringify(report, null, 2),
      };
    } catch (e) {
      const err = toPipelineError(e, 'plutus-backtest-setups', 'ALL');
      log.info(`backtest FAILED: ${err.message}`);
      return {
        title: 'Backtest FAILED',
        output: JSON.stringify({ status: 'FATAL', error: err.message }),
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL: plutus-save-screenshot — Save base64 image as binary PNG
// ═══════════════════════════════════════════════════════════════════════════════

const plutusSaveScreenshot = tool({
  description:
    'Save a base64-encoded screenshot to disk as a binary PNG file. ' +
    'Use this AFTER calling tv_screenshot — tv_screenshot returns base64 data, ' +
    'this tool decodes it and writes a real binary PNG file. ' +
    'The write tool CANNOT write binary files — it writes text. ' +
    'You MUST use this tool to save tv_screenshot output.',
  args: {
    data: z.string().describe('Base64-encoded PNG image data from tv_screenshot. Pass the ENTIRE base64 string.'),
    filePath: z.string().describe('Absolute file path for the output PNG, e.g. /tmp/plutus_dxy_4H.png'),
  },
  async execute(args): Promise<ToolResult> {
    try {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const { dirname } = await import('node:path');

      // Strip data URI prefix if present
      let b64 = args.data;
      if (b64.startsWith('data:')) {
        b64 = b64.split(',')[1] ?? b64;
      }

      // Decode base64 to binary buffer
      const buffer = Buffer.from(b64, 'base64');

      if (buffer.length < 100) {
        return {
          title: 'Save screenshot FAILED — data too small',
          output: JSON.stringify({ status: 'FATAL', error: `Decoded buffer is only ${buffer.length} bytes. The base64 data may be invalid or truncated.` }),
        };
      }

      // Create directory and write binary file
      await mkdir(dirname(args.filePath), { recursive: true });
      await writeFile(args.filePath, buffer);

      log.info(`save-screenshot: wrote ${buffer.length} bytes to ${args.filePath}`);

      return {
        title: `Screenshot saved — ${buffer.length} bytes`,
        output: JSON.stringify({
          status: 'success',
          path: args.filePath,
          size: buffer.length,
          sizeKB: Math.round(buffer.length / 1024),
        }),
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return {
        title: 'Save screenshot FAILED',
        output: JSON.stringify({ status: 'FATAL', error: err }),
      };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL REGISTRY EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

// v4.5.4 Phase 7 (the spec §7.4 + §6.5): the STEP A/B + gate tools are built
// with the context accessor injected (no runtime circular import). The D5
// chain: harvest → zones → STEP A → shapes → STEP B → setups → gate. The
// charts/browse/backtest/save tools REMAIN registered (the VLM verification
// path — "data 80%, vision 20%" Law 37) but are NOT in the mandatory D5 order.
const plutusPipelineReasonStepA = buildStepATool({ ensureContext, log });
const plutusPipelineReasonStepB = buildStepBTool({ ensureContext, log });
const plutusPipelineGate = buildGateTool({ ensureContext, resetContext, log });

export function createPipeline4Tools(): Record<string, ReturnType<typeof tool>> {
  return {
    'plutus-pipeline-harvest': plutusPipelineHarvest,
    'plutus-pipeline-zones': plutusPipelineZones,
    'plutus-pipeline-shapes': plutusPipelineShapes,
    'plutus-pipeline-charts': plutusPipelineCharts,
    'plutus-pipeline-setups': plutusPipelineSetups,
    'plutus-browse-screenshot': plutusBrowseScreenshot,
    'plutus-backtest-setups': plutusBacktestSetups,
    'plutus-save-screenshot': plutusSaveScreenshot,
  };
}

/**
 * The v4.5.4 7-tool chain (the D5 order — the spec §2.1 + §7.4):
 *   harvest → zones → reason-step-a → shapes → reason-step-b → setups → gate
 * with the retained legacy tools (charts · browse-screenshot · backtest ·
 * save-screenshot) still registered — the D5 order is the MANDATORY chain;
 * the retained tools serve the VLM verification path (the spec §6.5).
 */
export function createPipeline7Tools(): Record<string, ReturnType<typeof tool>> {
  return {
    // THE D5 ORDER (the mandatory chain):
    'plutus-pipeline-harvest': plutusPipelineHarvest,
    'plutus-pipeline-zones': plutusPipelineZones,
    'plutus-pipeline-reason-step-a': plutusPipelineReasonStepA,
    'plutus-pipeline-shapes': plutusPipelineShapes,
    'plutus-pipeline-reason-step-b': plutusPipelineReasonStepB,
    'plutus-pipeline-setups': plutusPipelineSetups,
    'plutus-pipeline-gate': plutusPipelineGate,
    // THE RETAINED LEGACY (registered, NOT in the mandatory D5 order):
    'plutus-pipeline-charts': plutusPipelineCharts,
    'plutus-browse-screenshot': plutusBrowseScreenshot,
    'plutus-backtest-setups': plutusBacktestSetups,
    'plutus-save-screenshot': plutusSaveScreenshot,
  };
}
