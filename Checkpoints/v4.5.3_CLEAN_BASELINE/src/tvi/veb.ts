// ═══════════════════════════════════════════════════════════════════
// TVI — VISUAL ENFORCEMENT BRAIN (VEB) — PRE/POST GATES
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §5 (VEB) + §10.2 (profiles) + §15 (perf)
//
// PRE-gates (tool.execute.before, plutus-pipeline-setups): BLOCK by
// throwing. Only this hook may block — all other hooks are non-blocking.
// POST-gates (tool.execute.after): record violations to the VST and
// queue warn bullets. They NEVER throw.
//
// CONTEXT BRIDGE (spec §5.3): the VEB maintains its OWN TVIContext,
// populated by tool.execute.after hooks — recordScreenshots() when
// plutus-pipeline-charts completes, recordImageRead() when read() hits
// an image file. The VEB never imports pipeline-internal context.
//
// V4.3 DOCTRINE RECONCILIATION (operator doctrine D27/D28):
// The current pipeline LEGITIMATELY uses FALLBACK_IP_EDGE zones as
// honest supplements. Therefore:
//   - P4 fires ONLY on type === 'IP' zones. A FALLBACK_IP_EDGE *source*
//     does NOT block — the fallback supplement is doctrine-valid.
//   - P2 counts FALLBACK_IP_EDGE supplements toward the 3-zone minimum
//     alongside VLM_CONFIRMED/VLM_NEW (incl. _LQZ variants). Spec §5 P2
//     predates V4.3; counting only VLM sources would reject doctrine-
//     valid runs that supplement 2 VLM zones with 1 fallback zone.
//
// Performance: pre-gates are array filters + boolean evaluation over
// in-memory state — no I/O on the gate path. VST writes are prepared-
// statement inserts (post-gate / recording path only where possible).
// Budgets (§15): tool.execute.before < 10ms, tool.execute.after < 15ms.
// ═══════════════════════════════════════════════════════════════════

import type { AgentState, TVIContext, ValidatedZone } from './types.js';
import { GENERIC_EVIDENCE_PATTERNS } from './types.js';
import type { MatchedNode, VisualContextMatcher } from './vcm.js';
import type { VisualStateTracker } from './vst.js';
import type { VisualGuidanceSystem } from './vgs.js';

export interface VEBDeps {
  vcm: VisualContextMatcher;
  vst: VisualStateTracker;
  vgs: VisualGuidanceSystem;
}

/** Tool name gated by the VEB (spec §5.3 hook wiring) */
const SETUPS_TOOL = 'plutus-pipeline-setups';

/** P5: screenshots older than this trigger a freshness WARN (10 minutes) */
const SCREENSHOT_FRESHNESS_MS = 600_000;

/** P2: minimum validated zones required before setups may run */
const MIN_ZONES = 3;

/** V3: max |zoneMid - spot| — ±2.00 for DXY, ±0.020 (200 pips) for FX */
const DXY_MAX_DIST = 2.0;
const FX_MAX_DIST = 0.02;

/** Zone sources produced by the agent's visual perception (incl. _LQZ variants) */
const VLM_SOURCES: ReadonlySet<string> = new Set([
  'VLM_CONFIRMED',
  'VLM_NEW',
  'VLM_CONFIRMED_LQZ',
  'VLM_NEW_LQZ',
]);

/** V4.3 doctrine-valid Engine 1 supplement source (D27/D28) — see header */
const FALLBACK_SUPPLEMENT_SOURCE = 'FALLBACK_IP_EDGE';

/** Image extensions recognized by recordImageRead */
const IMAGE_EXT_RE = /\.(png|jpe?g)$/i;

/** Image path extraction from stringified tool output (matches paths embedded in prose) */
const IMAGE_PATH_RE = /[\w/.\-]+\.(?:png|jpe?g)/gi;

/** Canon pairs for filename-based pair attribution */
const KNOWN_PAIRS: readonly string[] = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];

/** Timeframe tokens recognized in screenshot filenames */
const TF_RE = /(?:^|[_/])(4H|1H|30m|15m)(?=[_.])/i;

/** Fresh empty context — the VEB owns its state (spec §5.3 context bridge) */
function defaultContext(): TVIContext {
  return {
    screenshots: [],
    screenshotsRead: [],
    zonesDrawn: 0,
    validatedZones: [],
    zoneMapSnapshot: null,
    shapeSnapshot: null,
    harvestData: null,
    runId: '',
    weekStart: '',
  };
}

/**
 * Normalize hook args across opencode hook-input shapes.
 * CONTAINER EVIDENCE (Phase 7, 6 iterations): opencode 1.14.43 passes
 * tool.execute.before/after hook args as a JSON STRING, not a parsed object —
 * so container.validatedZones is undefined and every gate saw 0 zones
 * ("MINIMUM_ZONES: 0/3 … Saw: ." across 25-object calls). Handle all shapes:
 *   (a) JSON string of the args object
 *   (b) envelope { tool, args } where args is a JSON string OR an object
 *   (c) the args object itself
 */
function normalizeArgs(input: unknown): Record<string, unknown> {
  let c: unknown = input;
  // (a) string — parse as JSON if possible
  if (typeof c === 'string') {
    try { c = JSON.parse(c); } catch { return {}; }
  }
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    const obj = c as Record<string, unknown>;
    // (b) envelope with an args field — unwrap it (parsing if it's a string)
    if ('args' in obj && (typeof obj.args === 'string' || (obj.args && typeof obj.args === 'object'))) {
      const inner = obj.args;
      if (typeof inner === 'string') {
        try { return JSON.parse(inner) as Record<string, unknown>; } catch { return {}; }
      }
      return inner as Record<string, unknown>;
    }
    // (c) plain args object
    return obj;
  }
  return {};
}

/** Pull the validatedZones array out of tool args/output (absent → empty) */
function extractZones(container: unknown): ValidatedZone[] {
  const c = normalizeArgs(container);
  const zones = c.validatedZones;
  if (Array.isArray(zones)) return zones as ValidatedZone[];
  return [];
}

/** Best-effort pair attribution from a screenshot path (deterministic) */
function pairFromPath(path: string): string {
  for (const pair of KNOWN_PAIRS) {
    if (path.includes(pair)) return pair;
  }
  // Unslashed filename variants (EURUSD, GBPUSD, AUDUSD)
  for (const pair of KNOWN_PAIRS) {
    const compact = pair.replace('/', '');
    if (compact !== pair && path.includes(compact)) return pair;
  }
  return '';
}

/** Best-effort timeframe attribution from a screenshot path (deterministic) */
function timeframeFromPath(path: string): string {
  const m = TF_RE.exec(path);
  return m ? m[1].toUpperCase() : '';
}

export class VisualEnforcementBrain {
  /** Self-contained TVI context (spec §5.3) — populated by after-hooks */
  public ctx: TVIContext;

  private readonly vcm: VisualContextMatcher;
  private readonly vst: VisualStateTracker;
  private readonly vgs: VisualGuidanceSystem;

  constructor(deps: VEBDeps) {
    this.vcm = deps.vcm;
    this.vst = deps.vst;
    this.vgs = deps.vgs;
    this.ctx = defaultContext();
  }

  /** Merge external state into the VEB context (runId, weekStart, harvestData, …) */
  updateContext(patch: Partial<TVIContext>): void {
    Object.assign(this.ctx, patch);
  }

  // ─────────────────────────────────────────────────────────────────
  // PRE-ACTION GATES (spec §5.1) — tool.execute.before — MAY THROW
  // ─────────────────────────────────────────────────────────────────

  /**
   * Evaluate P1-P5 against the upcoming plutus-pipeline-setups call.
   * Blocking gates push a T0 bullet via the VGS, record the enforcement
   * decision in the VST, then throw. Non-setup tools pass through.
   *
   * TRUSTED profile (§10.2): only the two CRITICAL gates run — P1
   * (must read screenshot) and P4 (no IP entries).
   */
  preActionGates(toolArgs: Record<string, unknown>, toolName: string): void {
    if (toolName !== SETUPS_TOOL) return;

    // Normalize hook args FIRST (opencode 1.14.x may pass them as a JSON string
    // or an envelope { tool, args } — see normalizeArgs header for the 6-iteration
    // container evidence). Every gate below reads from the normalized object.
    const normalizedArgs = normalizeArgs(toolArgs);
    const zones = extractZones(normalizedArgs);
    const trusted = this.vgs.getProfile() === 'TRUSTED';

    // ── GATE P1: MUST_READ_SCREENSHOT (critical — all profiles) ──
    if (!this.ctx.screenshotsRead || this.ctx.screenshotsRead.length === 0) {
      this.vgs.block('Read() the screenshot first — then produce ZONE| lines.', {
        gate: 'P1',
        reason: 'no chart screenshots have been read',
      });
      this.vst.recordEnforcement('P1_MUST_READ_SCREENSHOT', 'blocked', 'screenshotsRead is empty');
      throw new Error(
        '[TVI] MUST_READ_SCREENSHOT: read() the chart screenshots before calling plutus-pipeline-setups.',
      );
    }
    this.vst.recordEnforcement('P1_MUST_READ_SCREENSHOT', 'passed', `${this.ctx.screenshotsRead.length} screenshot(s) read`);

    if (trusted) {
      // TRUSTED: critical gates only — evaluate P4 and stop (spec §10.2)
      this.gateP4_noIpEntries(zones);
      return;
    }

    // ── GATE P2: MINIMUM_ZONES (≥3 valid zones) ──
    // V4.3: VLM sources AND doctrine-valid FALLBACK_IP_EDGE supplements
    // both count toward the minimum (see header reconciliation note).
    //
    // SOURCE NORMALIZATION (Phase 7 container evidence): the agent's ZONE|
    // wire format has NO source field — agents legitimately omit `source` on
    // converted objects. The zod schema (engine.ts:732) defaults missing
    // source to 'VLM_CONFIRMED' at the TOOL layer, but this before-hook sees
    // RAW args before defaults apply. An agent-produced zone without an
    // explicit source IS a VLM zone (fallback supplements are added by the
    // TOOL, never by the agent) — so undefined/empty normalizes to
    // 'VLM_CONFIRMED' for counting, matching schema-default semantics.
    // Malformed entries (ZONE| text strings, non-objects, non-numeric
    // prices) do NOT count — they surface their own error downstream.
    const isZoneObject = (z: unknown): boolean =>
      typeof z === 'object' && z !== null &&
      typeof (z as { top?: unknown }).top === 'number' &&
      typeof (z as { bottom?: unknown }).bottom === 'number' &&
      Number.isFinite((z as { top: number }).top) &&
      Number.isFinite((z as { bottom: number }).bottom);
    const normalizedSource = (z: { source?: unknown }): string =>
      (typeof z.source === 'string' && z.source.length > 0) ? z.source : 'VLM_CONFIRMED';
    const countable = zones.filter(
      (z) => isZoneObject(z) &&
        (VLM_SOURCES.has(normalizedSource(z)) || normalizedSource(z) === FALLBACK_SUPPLEMENT_SOURCE),
    );
    // ZONE| TEXT PATH (Phase 7 container evidence): the agent produces ZONE| lines
    // as TEXT and calls setups with weekStart + zoneAnalysis (the harness-parse
    // path — engine.ts parses via zip.parseZoneLines AFTER this gate). When
    // validatedZones is empty/malformed but zoneAnalysis carries ZONE| lines,
    // count the text lines so P2 doesn't block the harness-parse path. The full
    // deterministic verification still runs in the tool (parseZoneLines +
    // verifyZone + the 3-layer firewall) — this gate only checks for PRESENCE.
    let textZoneCount = 0;
    if (countable.length < MIN_ZONES) {
      const za = (normalizedArgs as { zoneAnalysis?: unknown }).zoneAnalysis;
      if (typeof za === 'string' && za.includes('ZONE|')) {
        textZoneCount = za.split('\n').filter((l) => l.trim().startsWith('ZONE|')).length;
      }
    }
    if (countable.length + textZoneCount < MIN_ZONES) {
      const seenSources = zones
        .map((z) => (typeof z === 'object' && z !== null ? String((z as { source?: unknown }).source ?? '(missing)') : '(not an object)'))
        .slice(0, 6)
        .join(', ');
      this.vgs.block(`< 3 validated zones — need source: 'VLM_CONFIRMED' or 'VLM_NEW'.`, {
        gate: 'P2',
        reason: `only ${countable.length}/${MIN_ZONES} validated zones (saw sources: ${seenSources})`,
      });
      this.vst.recordEnforcement('P2_MINIMUM_ZONES', 'blocked', `${countable.length}/${MIN_ZONES} validated zones (sources: ${seenSources})`);
      throw new Error(`[TVI] MINIMUM_ZONES: ${countable.length}/${MIN_ZONES} validated zones. Each zone object needs source: 'VLM_CONFIRMED' (aligned with a drawn rectangle) or 'VLM_NEW' (you found it). Saw: ${seenSources}. Produce more.`);
    }
    this.vst.recordEnforcement('P2_MINIMUM_ZONES', 'passed', `${countable.length} validated zones`);

    // ── GATE P3: BOTH_SIDES_REQUIRED (per pair) ──
    this.gateP3_bothSides(normalizedArgs, countable);

    // ── GATE P4: NO_IP_ZONES_AS_ENTRIES (critical — all profiles) ──
    this.gateP4_noIpEntries(zones);

    // ── GATE P5: SCREENSHOT_FRESHNESS (WARN only — never blocks) ──
    const now = Date.now();
    let staleCount = 0;
    for (const shot of this.ctx.screenshots) {
      const age = now - shot.capturedAt;
      if (age > SCREENSHOT_FRESHNESS_MS) {
        staleCount++;
        this.vgs.warn('Screenshot is > 10 min old — consider re-capturing.', {
          gate: 'P5',
          reason: `${shot.pair || shot.path} screenshot is ${Math.round(age / 1000)}s old`,
        });
        this.vst.recordEnforcement(
          'P5_SCREENSHOT_FRESHNESS',
          'warned',
          `${shot.pair || shot.path} age ${Math.round(age / 1000)}s > 600s`,
        );
      }
    }
    if (staleCount === 0) {
      this.vst.recordEnforcement('P5_SCREENSHOT_FRESHNESS', 'passed', 'all screenshots fresh');
    }
  }

  /** P3: zero zones for a declared pair → throw; one-sided → WARN only */
  private gateP3_bothSides(toolArgs: Record<string, unknown>, countable: ValidatedZone[]): void {
    // Pair scope: explicit toolArgs.pairs when the tool declares one,
    // otherwise the pairs actually present in the validated zones.
    const declared = toolArgs.pairs;
    const pairs: string[] =
      Array.isArray(declared) && declared.length > 0
        ? declared.map(String)
        : [...new Set(countable.map((z) => z.pair))];

    for (const pair of pairs) {
      const pairZones = countable.filter((z) => z.pair === pair);
      const hasSupply = pairZones.some((z) => z.type === 'SUPPLY');
      const hasDemand = pairZones.some((z) => z.type === 'DEMAND');

      if (!hasSupply && !hasDemand) {
        this.vgs.block(`${pair}: no zones identified — read the chart, both sides.`, {
          gate: 'P3',
          reason: `${pair} has zero zones`,
        });
        this.vst.recordEnforcement('P3_BOTH_SIDES_REQUIRED', 'blocked', `${pair} has zero zones`);
        throw new Error(`[TVI] BOTH_SIDES: ${pair} has zero zones.`);
      }

      if (!hasSupply || !hasDemand) {
        const found = hasSupply ? 'SUPPLY' : 'DEMAND';
        const missing = hasSupply ? 'DEMAND' : 'SUPPLY';
        const where = hasSupply ? 'below' : 'above';
        // WARN only — one-sided identification is flagged, not blocked
        this.vgs.warn(`Only ${found} zones found — also look for ${missing} ${where} spot.`, {
          gate: 'P3',
          reason: `${pair} is one-sided (${found} only)`,
        });
        this.vst.recordEnforcement('P3_BOTH_SIDES_REQUIRED', 'warned', `${pair}: ${found} only`);
      }
    }
  }

  /**
   * P4: NO_IP_ZONES_AS_ENTRIES.
   * V4.3 RECONCILIATION: blocks ONLY on type === 'IP'. Zones with source
   * FALLBACK_IP_EDGE are doctrine-valid honest supplements (D27/D28) and
   * do NOT block — spec §5 P4 predates the V4.3 supplement doctrine.
   */
  private gateP4_noIpEntries(zones: ValidatedZone[]): void {
    for (const vz of zones) {
      if ((vz.type as string) === 'IP') {
        this.vgs.block('IP zones are NOT entry zones. Use S/D and LQZ only.', {
          gate: 'P4',
          reason: `${vz.pair} zone at ${vz.top}/${vz.bottom} has type IP`,
          antiPattern: true,
        });
        this.vst.recordEnforcement('P4_NO_IP_ZONES_AS_ENTRIES', 'blocked', `${vz.pair} IP zone submitted as entry`);
        throw new Error('[TVI] NO_IP_ENTRIES: IP zones are not entry zones.');
      }
    }
    this.vst.recordEnforcement('P4_NO_IP_ZONES_AS_ENTRIES', 'passed', 'no IP-type zones submitted');
  }

  // ─────────────────────────────────────────────────────────────────
  // POST-ACTION GATES (spec §5.2) — tool.execute.after — NEVER THROW
  // Each gate records violations to the VST and queues a warn bullet.
  // ─────────────────────────────────────────────────────────────────

  /**
   * Dual signature (the index wiring calls the 2-arg envelope form):
   *   postActionGates(args, 'plutus-pipeline-setups', output)
   *   postActionGates(hookInput, hookOutput) — hookInput = { tool, args }
   */
  postActionGates(
    toolArgs: Record<string, unknown>,
    toolName: string | unknown,
    toolOutput?: unknown,
  ): void {
    let name: string;
    let args: Record<string, unknown>;
    let out: unknown;
    if (typeof toolName === 'string') {
      name = toolName;
      args = toolArgs;
      out = toolOutput;
    } else {
      const env = toolArgs;
      name = typeof env?.tool === 'string' ? (env.tool as string) : '';
      args = env?.args && typeof env.args === 'object' ? (env.args as Record<string, unknown>) : env;
      out = toolName;
    }
    if (name !== SETUPS_TOOL) return;

    // Output zones take precedence; fall back to the input args zones.
    const outputZones = extractZones(out);
    const zones = outputZones.length > 0 ? outputZones : extractZones(args);
    if (zones.length === 0) return;

    this.ctx.validatedZones = zones;

    for (const vz of zones) {
      this.gateV1_structure(vz);
      this.gateV2_evidence(vz);
      this.gateV3_distance(vz);
      this.gateV4_entryType(vz);
      this.gateV5_freshness(vz);
    }
  }

  /** V1: ZONE_STRUCTURE_VALID — top must be strictly above bottom */
  private gateV1_structure(vz: ValidatedZone): void {
    if (vz.top <= vz.bottom) {
      const reason = `${vz.pair} ${vz.type} top (${vz.top}) <= bottom (${vz.bottom}) — invalid`;
      console.warn(`[TVI] ZONE_STRUCTURE: ${reason}`);
      this.vst.recordEnforcement('ZONE_STRUCTURE', 'warned', reason);
      this.vgs.warn('Zone top <= bottom — check price axis mapping.', { gate: 'V1', reason });
    }
  }

  /**
   * V2: EVIDENCE_SPECIFIC — ≥20 chars, exact-match generic list fails,
   * and the evidence must contain a price reference (3+ decimals).
   * Gate names match spec §5.2 log strings so VLD-4 REPEAT_ERROR
   * (getViolationCount('EVIDENCE_GENERIC')) reads them directly.
   */
  private gateV2_evidence(vz: ValidatedZone): void {
    const evidence = (vz.visualEvidence ?? '').toLowerCase();

    if (GENERIC_EVIDENCE_PATTERNS.some((g) => evidence === g) || evidence.length < 20) {
      const reason = `${vz.pair} ${vz.type} evidence too generic: "${vz.visualEvidence}"`;
      console.warn(`[TVI] EVIDENCE_GENERIC: ${reason}`);
      this.vst.recordEnforcement('EVIDENCE_GENERIC', 'warned', reason);
      this.vgs.warn('Generic evidence — name the EXACT pattern with prices.', {
        gate: 'V2',
        reason,
        antiPattern: true,
        warhead: 'evidence-format-guide',
      });
    }

    if (!/\d+\.\d{3,}/.test(vz.visualEvidence ?? '')) {
      const reason = `${vz.pair} ${vz.type} evidence lacks price reference`;
      console.warn(`[TVI] EVIDENCE_NO_PRICE: ${reason}`);
      this.vst.recordEnforcement('EVIDENCE_NO_PRICE', 'warned', reason);
      this.vgs.warn("visualEvidence needs exact prices (e.g. 'at 1.1480').", {
        gate: 'V2',
        reason,
        warhead: 'evidence-format-guide',
      });
    }
  }

  /**
   * V3: ZONE_DISTANCE_VALID — zone mid within ±200p FX / ±2.00 DXY of spot.
   * Skipped deterministically when no spot is known for the pair —
   * a distance gate without a reference price cannot evaluate.
   */
  private gateV3_distance(vz: ValidatedZone): void {
    const spot =
      this.ctx.harvestData?.spots?.[vz.pair] ?? this.ctx.zoneMapSnapshot?.spots?.[vz.pair];
    if (spot === undefined) return;

    const zoneMid = (vz.top + vz.bottom) / 2;
    const maxDist = vz.pair === 'DXY' ? DXY_MAX_DIST : FX_MAX_DIST;
    if (Math.abs(zoneMid - spot) > maxDist) {
      const reason = `${vz.pair} ${vz.type} at ${zoneMid} is ${Math.abs(zoneMid - spot).toFixed(4)} from spot ${spot} (max ${maxDist})`;
      console.warn(`[TVI] ZONE_DISTANCE: ${reason}`);
      this.vst.recordEnforcement('ZONE_DISTANCE', 'warned', reason);
      this.vgs.warn('Zone too far from spot — verify price axis reading.', {
        gate: 'V3',
        reason,
        warhead: 'price-axis-reading',
      });
    }
  }

  /**
   * V4: ZONE_TYPE_ENTRY_VALID — S/D (BoM/MoM) or LQZ only.
   * Reconciliation with spec §6.3 verifyZone: UNMITIGATED classification
   * is also accepted — it marks the strongest (never-retested) zones and
   * §6.3 explicitly exempts it from the S/D-or-LQZ requirement.
   */
  private gateV4_entryType(vz: ValidatedZone): void {
    const isSdZone = vz.classification === 'BoM' || vz.classification === 'MoM';
    const isLqzZone = vz.type === 'LIQUIDITY';
    if (!isSdZone && !isLqzZone && vz.classification !== 'UNMITIGATED') {
      const reason = `${vz.pair} ${vz.type} is not S/D or LQZ — not a valid entry zone`;
      console.warn(`[TVI] ZONE_TYPE: ${reason}`);
      this.vst.recordEnforcement('ZONE_TYPE', 'warned', reason);
      this.vgs.warn('Zone type not S/D or LQZ — not a valid entry zone.', { gate: 'V4', reason });
    }
  }

  /** V5: ZONE_FRESHNESS_CHECK — 3+ reactions = depleted, TP only */
  private gateV5_freshness(vz: ValidatedZone): void {
    if (vz.reactionCount >= 3) {
      const reason = `${vz.pair} ${vz.type} has ${vz.reactionCount} reactions — depleted, TP only`;
      console.warn(`[TVI] ZONE_FRESHNESS: ${reason}`);
      this.vst.recordEnforcement('ZONE_FRESHNESS', 'warned', reason);
      this.vgs.warn('Zone has 3+ reactions — depleted, TP only.', { gate: 'V5', reason });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // CONTEXT BRIDGE RECORDERS (spec §5.3) — tool.execute.after hooks
  // ─────────────────────────────────────────────────────────────────

  /**
   * plutus-pipeline-charts after-hook: record the screenshots the charts
   * tool produced into the VEB's own context (ctx.screenshots) and VST.
   * Sources: (a) structured output.screenshots entries, (b) image paths
   * found in the stringified output. Deduped by path. Never throws.
   */
  recordScreenshots(input: Record<string, unknown>, output: unknown): void {
    const found = new Map<string, { pair: string; timeframe: string; sizeBytes: number }>();

    // (a) structured screenshots array on the output object
    if (output && typeof output === 'object') {
      const shots = (output as Record<string, unknown>).screenshots;
      if (Array.isArray(shots)) {
        for (const s of shots) {
          if (s && typeof s === 'object') {
            const rec = s as Record<string, unknown>;
            if (typeof rec.path === 'string' && IMAGE_EXT_RE.test(rec.path)) {
              found.set(rec.path, {
                pair: typeof rec.pair === 'string' && rec.pair ? rec.pair : pairFromPath(rec.path),
                timeframe:
                  typeof rec.timeframe === 'string' && rec.timeframe
                    ? rec.timeframe
                    : timeframeFromPath(rec.path),
                sizeBytes: typeof rec.sizeBytes === 'number' ? rec.sizeBytes : 0,
              });
            }
          }
        }
      }
    }

    // (b) image paths anywhere in the stringified output
    const text = JSON.stringify(output ?? '');
    IMAGE_PATH_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMAGE_PATH_RE.exec(text)) !== null) {
      const path = m[0];
      if (!found.has(path)) {
        found.set(path, { pair: pairFromPath(path), timeframe: timeframeFromPath(path), sizeBytes: 0 });
      }
    }

    const now = Date.now();
    for (const [path, meta] of found) {
      if (this.ctx.screenshots.some((s) => s.path === path)) continue;
      this.ctx.screenshots.push({
        path,
        pair: meta.pair,
        timeframe: meta.timeframe,
        sizeBytes: meta.sizeBytes,
        capturedAt: now,
      });
      this.vst.recordScreenshot(path, meta.pair, meta.timeframe, meta.sizeBytes);
    }
  }

  /**
   * read() after-hook: when the agent reads an image file, record it in
   * ctx.screenshotsRead (drives gate P1) and the VST image_reads table
   * (drives VLD-1 STALE_READ). Accepts either the raw tool args or a
   * hook envelope ({ tool, args }). Never throws.
   */
  recordImageRead(input: Record<string, unknown>, output: unknown): void {
    const args =
      input && typeof input === 'object' && input.args && typeof input.args === 'object'
        ? (input.args as Record<string, unknown>)
        : input;

    const filePath =
      typeof args?.filePath === 'string'
        ? args.filePath
        : typeof args?.path === 'string'
          ? args.path
          : '';

    if (!filePath || !IMAGE_EXT_RE.test(filePath)) return;

    if (!this.ctx.screenshotsRead.includes(filePath)) {
      this.ctx.screenshotsRead.push(filePath);
    }
    this.vst.recordImageRead(filePath, pairFromPath(filePath), timeframeFromPath(filePath));
  }

  // ─────────────────────────────────────────────────────────────────
  // VCM ACCESS — matched VKG guidance nodes for the current state.
  // Used by the index wiring to attach knowledge bullets to turns.
  // ─────────────────────────────────────────────────────────────────

  getGuidanceNodes(state: AgentState): MatchedNode[] {
    return this.vcm.match(state);
  }
}

/** Singleton factory — one VEB per plugin lifecycle (spec §5.3 wiring) */
export function createVEB(deps: VEBDeps): VisualEnforcementBrain {
  return new VisualEnforcementBrain(deps);
}
