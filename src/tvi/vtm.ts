// ═══════════════════════════════════════════════════════════════════
// TVI — TRAJECTORY MONITOR (VTM) + ANTI-DERAILMENT SYSTEM
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §10.2 (health score + adaptive
// profiles, verbatim logic) and §11 (12 behavioral patterns AD-1..12).
//
// VTM tracks the agent's success rate over the last 10 pipeline runs
// and adjusts VGS enforcement intensity: TRUSTED (>0.85, light),
// STANDARD (>0.60, normal), GUIDED (heavy, T1 warheads).
//
// The 12 AD patterns detect derailments from the visual workflow.
// Every check is DETERMINISTIC from VST state / AgentState / zone
// data — zero model inference.
//
// Blocking policy: AD-3, AD-4, AD-10 are block-priority findings;
// all other AD patterns warn (spec §11 priorities).
// ═══════════════════════════════════════════════════════════════════

import type { AgentState, TVIFinding, ValidatedZone } from './types.js';
import type { VisualStateTracker } from './vst.js';
import type { VisualGuidanceSystem, VGSProfile } from './vgs.js';

/** VTM dependencies — state tracker (trajectory) and guidance (profiles/bullets) */
export interface TrajectoryMonitorDeps {
  vst: VisualStateTracker;
  vgs: VisualGuidanceSystem;
}

/** Extra evidence for the AD checks that need data outside AgentState */
export interface AntiDerailmentExtra {
  /** Tool the agent just called (AD-1) */
  toolCalled?: string;
  /** Zones under evaluation (AD-2,3,4,5,6,9,10,11,12) */
  zones?: ValidatedZone[];
  /** Pair of the screenshot being read (AD-10) */
  screenshotPair?: string;
  /** Timeframe of the screenshot being read (AD-8) */
  screenshotTimeframe?: string;
  /** Age of the screenshot in ms (AD-7) */
  screenshotAge?: number;
}

// ─────────────────────────────────────────────────────────────────
// AD-1: computation tools (spec §11 — bash / python / script calls
// during zone identification mean the agent is computing, not seeing)
// ─────────────────────────────────────────────────────────────────
const AD1_COMPUTATION_TOOLS: ReadonlySet<string> = new Set([
  'bash',
  'sh',
  'shell',
  'exec',
  'python',
  'python3',
  'script',
]);

// ─────────────────────────────────────────────────────────────────
// AD-3: evidence/zone-type contradiction dictionaries. A SUPPLY zone
// is confirmed by BEARISH price action; a DEMAND zone by BULLISH.
// The opposite pairing is fabricated evidence (spec §11).
// ─────────────────────────────────────────────────────────────────
const BULLISH_PATTERN: RegExp =
  /bullish engulfing|bullish pin|hammer|morning star|bullish harami|bullish rejection/i;
const BEARISH_PATTERN: RegExp =
  /bearish engulfing|bearish pin|shooting star|evening star|bearish harami|bearish rejection/i;

// ─────────────────────────────────────────────────────────────────
// AD-4: max sane zone width per timeframe in PIPS — 3× the typical
// width (spec §10.2 proxy: 4H typical ~13p, 1H ~8p, 30m ~5p, 15m ~3p).
// Wider than this means the boundaries were not read off the price axis.
// ─────────────────────────────────────────────────────────────────
const AD4_MAX_WIDTH_PIPS: Readonly<Record<string, number>> = {
  '4H': 40,
  '1H': 25,
  '30m': 15,
  '15m': 10,
};

/** AD-7: screenshot older than 10 minutes is stale (spec §11) */
const AD7_STALE_MS = 600_000;

/** AD-11/AD-12: golden standard 5-10 zones per pair (spec §11) */
const AD11_MAX_ZONES_PER_PAIR = 15;
const AD12_MIN_ZONES_PER_PAIR = 3;

/** AD-6: all midpoints within this many pips of spot = clustered */
const AD6_CLUSTER_PIPS = 10;

/**
 * Pip size by pair. DXY is an index quoted to 2-3 decimals (0.01 = 1 pip);
 * the FX pairs (EUR/USD, GBP/USD, AUD/USD) are quoted to 4-5 decimals
 * (0.0001 = 1 pip). Deterministic — no inference.
 */
function pipSizeForPair(pair: string): number {
  return pair === 'DXY' ? 0.01 : 0.0001;
}

export class TrajectoryMonitor {
  private readonly vst: VisualStateTracker;
  private readonly vgs: VisualGuidanceSystem;

  constructor(deps: TrajectoryMonitorDeps) {
    this.vst = deps.vst;
    this.vgs = deps.vgs;
  }

  // ─────────────────────────────────────────────────────────────────
  // HEALTH SCORE (spec §10.2 verbatim): gates passed / total gates over
  // the last 10 runs. 0.5 neutral when there is no usable history.
  // ─────────────────────────────────────────────────────────────────
  computeHealthScore(): number {
    const history = this.vst.getTrajectoryHistory(10);
    if (history.length === 0) return 0.5; // neutral start

    const totalGates = history.reduce((sum, h) => sum + h.gates_passed + h.gates_failed, 0);
    const passedGates = history.reduce((sum, h) => sum + h.gates_passed, 0);

    return totalGates > 0 ? passedGates / totalGates : 0.5;
  }

  // ─────────────────────────────────────────────────────────────────
  // PROFILE (spec §10.2 verbatim thresholds):
  //   > 0.85 TRUSTED (light) | > 0.60 STANDARD (normal) | else GUIDED
  // ─────────────────────────────────────────────────────────────────
  getProfile(): VGSProfile {
    const healthScore = this.computeHealthScore();
    if (healthScore > 0.85) return 'TRUSTED';
    if (healthScore > 0.60) return 'STANDARD';
    return 'GUIDED';
  }

  /**
   * Recompute health, push the derived profile into the VGS, and log
   * the transition when it changes. Returns the new profile.
   */
  updateProfile(): VGSProfile {
    const previous = this.vgs.getProfile();
    const next = this.getProfile();
    this.vgs.setProfile(next);
    if (next !== previous) {
      console.warn(
        `[TVI] VTM profile transition: ${previous} -> ${next} (health=${this.computeHealthScore().toFixed(3)})`,
      );
    }
    return next;
  }

  /**
   * Record a completed pipeline run into the trajectory history, then
   * re-derive the enforcement profile from the extended history.
   */
  recordRun(
    runId: string,
    weekStart: string,
    zonesProduced: number,
    zonesValidated: number,
    setupsProduced: number,
    gatesPassed: number,
    gatesFailed: number,
  ): VGSProfile {
    this.vst.recordTrajectory(
      runId,
      weekStart,
      zonesProduced,
      zonesValidated,
      setupsProduced,
      gatesPassed,
      gatesFailed,
    );
    return this.updateProfile();
  }

  // ─────────────────────────────────────────────────────────────────
  // ANTI-DERAILMENT SYSTEM (spec §11) — 12 behavioral patterns.
  // Deterministic checks over AgentState + zone data. Returns every
  // triggered finding. Block-priority: AD-3, AD-4, AD-10. All others
  // warn. Zones-scoped checks (AD-2,5,6,9,11,12) evaluate the zones
  // for state.pair; AD-3/AD-4/AD-10 evaluate per-zone.
  // ─────────────────────────────────────────────────────────────────
  checkAntiDerailment(state: AgentState, extra: AntiDerailmentExtra = {}): TVIFinding[] {
    const findings: TVIFinding[] = [];
    const zones = extra.zones;
    const pairZones = zones ? zones.filter((z) => z.pair === state.pair) : undefined;
    const pip = pipSizeForPair(state.pair);

    // ── AD-1: COMPUTATIONAL_INSTEAD_OF_VISUAL (warn) ──
    if (extra.toolCalled !== undefined) {
      const tool = extra.toolCalled.toLowerCase();
      if (AD1_COMPUTATION_TOOLS.has(tool)) {
        findings.push(
          this.vgs.warn("[AD-1] You're computing zones instead of seeing them. Read the chart.", {
            gate: 'AD-1',
            antiPattern: true,
            reason: `computation tool "${extra.toolCalled}" called during zone identification`,
          }),
        );
      }
    }

    // ── AD-2: RECTANGLE_CONFIRMATION_ONLY (warn) ──
    // All zones VLM_CONFIRMED, none VLM_NEW, and every evidence string
    // references only the drawn rectangle positions (spec §11 detection).
    if (zones && zones.length > 0) {
      const allConfirmed = zones.every((z) => z.source.startsWith('VLM_CONFIRMED'));
      const noneNew = !zones.some((z) => z.source.startsWith('VLM_NEW'));
      const evidenceOnlyRectangles = zones.every((z) => /rectangle/i.test(z.visualEvidence));
      if (allConfirmed && noneNew && evidenceOnlyRectangles) {
        findings.push(
          this.vgs.warn(
            '[AD-2] You confirmed rectangles without reading candle structure. Look deeper.',
            {
              gate: 'AD-2',
              antiPattern: true,
              reason: `all ${zones.length} zones VLM_CONFIRMED, none VLM_NEW, evidence references only rectangles`,
            },
          ),
        );
      }
    }

    // ── AD-3: EVIDENCE_FABRICATION (block) ──
    // Evidence pattern contradicts the zone type: bullish price action
    // cannot confirm SUPPLY; bearish price action cannot confirm DEMAND.
    if (zones) {
      for (const z of zones) {
        const ev = z.visualEvidence;
        const contradiction =
          (z.type === 'SUPPLY' && BULLISH_PATTERN.test(ev)) ||
          (z.type === 'DEMAND' && BEARISH_PATTERN.test(ev));
        if (contradiction) {
          findings.push(
            this.vgs.block("[AD-3] Evidence doesn't match chart. Describe what you ACTUALLY see.", {
              gate: 'AD-3',
              antiPattern: true,
              reason: `${z.pair} ${z.type} zone evidence "${ev.slice(0, 60)}" contradicts zone type`,
            }),
          );
        }
      }
    }

    // ── AD-4: PRICE_AXIS_CONFUSION (block) ──
    // Proxy for axis misalignment: inverted boundaries (top < bottom) or
    // a width beyond 3x the timeframe's typical zone width (spec §11).
    if (zones) {
      for (const z of zones) {
        const widthPips = (z.top - z.bottom) / pipSizeForPair(z.pair);
        const maxWidth = AD4_MAX_WIDTH_PIPS[z.timeframe] ?? AD4_MAX_WIDTH_PIPS['4H'];
        if (z.top < z.bottom || widthPips > maxWidth) {
          findings.push(
            this.vgs.block(
              "[AD-4] Zone boundaries don't match price axis. Read the numbers on the right side.",
              {
                gate: 'AD-4',
                antiPattern: true,
                reason:
                  z.top < z.bottom
                    ? `${z.pair} ${z.type} inverted: top ${z.top} < bottom ${z.bottom}`
                    : `${z.pair} ${z.type} width ${widthPips.toFixed(1)}p > ${maxWidth}p max for ${z.timeframe}`,
              },
            ),
          );
        }
      }
    }

    // ── AD-5: ONE_SIDED_IDENTIFICATION (warn) ──
    if (pairZones && pairZones.length > 0) {
      const allSupply = pairZones.every((z) => z.type === 'SUPPLY');
      const allDemand = pairZones.every((z) => z.type === 'DEMAND');
      const allLiquidity = pairZones.every((z) => z.type === 'LIQUIDITY');
      if (allSupply || allDemand || allLiquidity) {
        const found = allSupply ? 'SUPPLY' : allDemand ? 'DEMAND' : 'LIQUIDITY';
        const hint = allSupply
          ? 'DEMAND zones below'
          : allDemand
            ? 'SUPPLY zones above'
            : 'SUPPLY and DEMAND zones around';
        findings.push(
          this.vgs.warn(`[AD-5] Only ${found} zones found. Also look for ${hint} spot.`, {
            gate: 'AD-5',
            antiPattern: true,
            reason: `all ${pairZones.length} zones for ${state.pair} are ${found}`,
          }),
        );
      }
    }

    // ── AD-6: CLUSTERED_ZONES (warn) ──
    if (pairZones && pairZones.length > 0) {
      const maxDist = AD6_CLUSTER_PIPS * pip;
      const allClustered = pairZones.every(
        (z) => Math.abs((z.top + z.bottom) / 2 - state.spot) <= maxDist,
      );
      if (allClustered) {
        findings.push(
          this.vgs.warn('[AD-6] Zones clustered near spot. Spread across the visible range.', {
            gate: 'AD-6',
            antiPattern: true,
            reason: `all ${pairZones.length} zone midpoints within ${AD6_CLUSTER_PIPS} pips of spot ${state.spot}`,
          }),
        );
      }
    }

    // ── AD-7: STALE_ANALYSIS (warn) ──
    if (extra.screenshotAge !== undefined && extra.screenshotAge > AD7_STALE_MS) {
      findings.push(
        this.vgs.warn('[AD-7] Using stale data. Re-capture the chart for fresh analysis.', {
          gate: 'AD-7',
          antiPattern: true,
          reason: `screenshot age ${Math.round(extra.screenshotAge / 1000)}s > ${AD7_STALE_MS / 1000}s`,
        }),
      );
    }

    // ── AD-8: WRONG_TIMEFRAME (warn) ──
    // Zone identification requires the 4H chart (institutional structure).
    if (
      state.task === 'zone_identification' &&
      extra.screenshotTimeframe !== undefined &&
      extra.screenshotTimeframe !== '4H'
    ) {
      findings.push(
        this.vgs.warn(
          '[AD-8] Use 4H chart for zone identification. 4H shows institutional structure.',
          {
            gate: 'AD-8',
            antiPattern: true,
            reason: `screenshot timeframe ${extra.screenshotTimeframe} !== 4H for zone identification`,
          },
        ),
      );
    }

    // ── AD-9: IGNORED_LIQUIDITY (warn) ──
    if (zones && zones.length > 0 && !zones.some((z) => z.type === 'LIQUIDITY')) {
      findings.push(
        this.vgs.warn(
          '[AD-9] No liquidity zones identified. Look for stop hunts (long wicks through levels).',
          {
            gate: 'AD-9',
            antiPattern: true,
            reason: `no LIQUIDITY type in ${zones.length} zones`,
          },
        ),
      );
    }

    // ── AD-10: WRONG_PAIR_ATTRIBUTION (block) ──
    if (zones && extra.screenshotPair !== undefined) {
      for (const z of zones) {
        if (z.pair !== extra.screenshotPair) {
          findings.push(
            this.vgs.block(
              "[AD-10] Zone pair doesn't match screenshot. Check which chart you're reading.",
              {
                gate: 'AD-10',
                antiPattern: true,
                reason: `zone pair ${z.pair} !== screenshot pair ${extra.screenshotPair}`,
              },
            ),
          );
        }
      }
    }

    // ── AD-11: OVER_PRODUCTION (warn) ──
    if (pairZones && pairZones.length > AD11_MAX_ZONES_PER_PAIR) {
      findings.push(
        this.vgs.warn(
          `[AD-11] Too many zones (${pairZones.length}). Focus on the clearest, highest-confidence zones.`,
          {
            gate: 'AD-11',
            antiPattern: true,
            reason: `${pairZones.length} zones for ${state.pair} > ${AD11_MAX_ZONES_PER_PAIR} max`,
          },
        ),
      );
    }

    // ── AD-12: UNDER_PRODUCTION (warn) ──
    if (pairZones && pairZones.length < AD12_MIN_ZONES_PER_PAIR) {
      findings.push(
        this.vgs.warn(
          `[AD-12] Too few zones (${pairZones.length}). Minimum 3 required. Look harder at the chart.`,
          {
            gate: 'AD-12',
            antiPattern: true,
            reason: `${pairZones.length} zones for ${state.pair} < ${AD12_MIN_ZONES_PER_PAIR} min`,
          },
        ),
      );
    }

    return findings;
  }
}
