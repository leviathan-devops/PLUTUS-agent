/**
 * Engine 3 (3D) — Visual Zone Lobe
 *
 * Multi-timeframe VLM zone identification with Engine 1 validation.
 *
 * METHODOLOGY (from screencast methodology):
 *   - 4H: Order Block S/D zones — the last BULLISH candle before a strong
 *     bearish move (supply), the last BEARISH candle before a strong bullish
 *     move (demand). The zone is drawn from that candle's range.
 *   - 1H/30m/15m: LQZ liquidity zones — wick clusters (2-4+ wick tips at one
 *     level), body edges (3+ bodies stopping at one level), FVG boundaries,
 *     tight consolidations (3-5 candles, ≤25 pips).
 *   - LQZ zones are NESTED INSIDE S/D zones (multiple LQZs inside one
 *     supply/demand zone). On lower TFs zones get NARROWER and snap to 15m
 *     candle wicks (telescoping refinement).
 *
 * PIPELINE (identifyZones):
 *   1. Multi-TF telescoping — TvChartController walks the chart down
 *      4H → 1H → 30m → 15m and captures a screenshot per timeframe.
 *   2. VLM validation per timeframe — the Engine 1 zone map is sent as a
 *      BASE MAP with exact price levels. The VLM is a VALIDATOR, not an
 *      identifier: it CONFIRMS visually real zones, REJECTS data
 *      artifacts, and adds NEW zones Engine 1 missed
 *      (CONFIRMED|… / REJECTED|… / NEW|… line format).
 *   3. Verdict resolution — CONFIRMED zones (high confidence) inherit the
 *      matched Engine 1 zone's name, reaction count and liquidity score;
 *      REJECTED Engine 1 zones are excluded as data artifacts; NEW zones
 *      stay medium confidence (VLM found, Engine 1 missed).
 *   4. Multi-TF merge — 4H zones are containers, LTF zones are refinements
 *      nested inside them; the narrower (LTF) coordinates win.
 *
 * NO FALLBACK LAW: Engine 3 NEVER uses Engine 1 IP zones as visual zones.
 * If the TvChartController, TvChartImageFetch, or the VLM itself fails, this
 * module THROWS with full context. There is no degraded mode and no fallback
 * chain.
 */

import { Logger } from '../utils/logger.js';
import type { TvChartImageFetch } from './tv-chart-image-fetch.js';
import {
  tvSymbolForPair,
  type TvChartController,
} from './tv-chart-controller.js';
import type {
  DXYZone,
  ZoneMapSnapshot,
  ShapePredictionSnapshot,
  ZoneType,
} from '../types.js';
import type { VisualSDZone } from './types.js';

const log = new Logger('VisualZoneLobe');

/**
 * Result of parsing one VLM validation response: the zones the VLM
 * confirmed or newly discovered, plus the Engine 1 base-map references it
 * rejected as data artifacts.
 */
export interface VlmValidationParseResult {
  zones: VisualSDZone[];
  /** Engine 1 zone refs ("Zone N", zoneName, or id) rejected by the VLM. */
  rejectedZoneRefs: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL ZONE LOBE
// ═══════════════════════════════════════════════════════════════════════════════

export class VisualZoneLobe {
  /**
   * @param chartFetch Self-contained chart capture + VLM tool (headed browser
   *                   CDP :9228 + opencode SDK client VLM). Provides the VLM
   *                   send path (analyzeScreenshot) for controller shots.
   *                   REQUIRED at identifyZones time — no fallback.
   * @param tvChartController playwright-core CDP input-injection controller
   *                   (navigate → set timeframe → zoom → screenshot) attached
   *                   to the SAME headed Chrome on :9228. REQUIRED at
   *                   identifyZones time — no fallback.
   */
  constructor(
    private chartFetch?: TvChartImageFetch,
    private tvChartController?: TvChartController,
  ) {}

  /**
   * Main entry point — identify visual S/D/L zones for a pair.
   *
   * Multi-TF telescoping VLM pipeline with Engine 1 validation. NO FALLBACK:
   * throws on any capture or VLM failure.
   *
   * @returns Array of VisualSDZone (merged across 4H/1H/30m/15m) and whether
   *          they came from the VLM (always true — no fallback path exists).
   */
  async identifyZones(
    pair: string,
    spot: number,
    zoneMap: ZoneMapSnapshot,
    shapePrediction: ShapePredictionSnapshot,
  ): Promise<{ zones: VisualSDZone[]; vcSourced: boolean }> {

    // ── STEP 1: Multi-TF telescoping — capture screenshots at 4H, 1H, 30m, 15m ──
    const controller = this.tvChartController;
    if (!controller) {
      throw new Error(`[engine3-vlm] ${pair}: TvChartController is required for visual zone identification. No fallback.`);
    }

    let screenshots: Array<{ tf: string; path: string }>;
    try {
      await controller.connect();
      const tvSymbol = tvSymbolForPair(pair);
      await controller.openChart(tvSymbol);
      await controller.zoomToWeek();
      // Draw the Engine 1 zone map on the chart so the VLM can SEE the zones
      // (RED = supply, BLUE = demand, GREEN = LQZ) instead of raw candlesticks.
      await controller.drawEngine1Zones(zoneMap.zones, spot);
      await controller.waitForTimeout(1_500); // zone shape render settle
      try {
        screenshots = await controller.captureMultiTfScreenshots(pair);
      } finally {
        // Remove the zone overlay so the shared chart is left clean.
        await controller.clearDrawnZones().catch((clearErr) => {
          log.warn(`  [engine3-vlm] ${pair}: zone overlay cleanup failed (non-fatal) — ${clearErr instanceof Error ? clearErr.message : String(clearErr)}`);
        });
      }
      log.info(`  [engine3-vlm] ${pair}: ${screenshots.length} TF screenshots captured`);
    } catch (e) {
      throw new Error(`[engine3-vlm] ${pair}: chart capture failed — ${(e as Error).message}. NO FALLBACK.`);
    }

    // ── STEP 2: VLM validation per timeframe (Engine 1 base map → CONFIRMED/REJECTED/NEW) ──
    const allVlmZones: VisualSDZone[] = [];
    const allRejectedRefs: string[] = [];

    for (const shot of screenshots) {
      const prompt = this.buildTfPrompt(pair, spot, shot.tf, zoneMap, shapePrediction);
      const result = await this.analyzeScreenshot(shot.path, prompt, pair, shot.tf);
      allVlmZones.push(...result.zones);
      allRejectedRefs.push(...result.rejectedZoneRefs);
      log.info(
        `  [engine3-vlm] ${pair} ${shot.tf}: ${result.zones.length} zones validated ` +
        `(${result.rejectedZoneRefs.length} Engine 1 zones rejected)`
      );
    }

    if (allVlmZones.length === 0) {
      throw new Error(`[engine3-vlm] ${pair}: VLM confirmed 0 zones and found 0 new zones across all timeframes (${allRejectedRefs.length} Engine 1 zones rejected). NO FALLBACK. Check screenshot quality and VLM prompt.`);
    }

    // ── STEP 3: Resolve VLM verdicts against the Engine 1 zone map ──
    const validatedZones = this.validateVisualZones(allVlmZones, allRejectedRefs, zoneMap, pair);

    // ── STEP 4: Merge multi-TF zones ──
    const mergedZones = this.mergeMultiTfZones(validatedZones);

    log.info(
      `  [engine3-vlm] ${pair}: ${allVlmZones.length} raw → ${validatedZones.length} validated → ` +
      `${mergedZones.length} merged visual zones`
    );

    return { zones: mergedZones, vcSourced: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TF-SPECIFIC VLM PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build the TF-specific VLM validation prompt.
   *
   * The VLM is a VALIDATOR, not an identifier. The Engine 1 zone map is
   * presented as a numbered BASE MAP with exact price levels and a
   * type-specific visual question per zone ("do you see a bearish reversal
   * pattern at X-Y?"). The VLM answers one verdict per zone:
   *
   *   CONFIRMED|TYPE|TOP|BOTTOM|CLASSIFICATION|TF  — zone is visually real
   *   REJECTED|ZONE_NAME                           — data artifact, nothing visible
   *   NEW|TYPE|TOP|BOTTOM|CLASSIFICATION|TF        — visible zone Engine 1 missed
   *
   * Zones ARE drawn on the screenshot as colored rectangles (RED = supply,
   * BLUE = demand, GREEN = LQZ) before capture; every zone entry also states
   * its exact price level so the VLM can cross-check the drawing against the
   * price axis.
   */
  private buildTfPrompt(
    pair: string,
    spot: number,
    tf: string,
    zoneMap: ZoneMapSnapshot,
    shapePrediction: ShapePredictionSnapshot,
  ): string {
    const decimals = pair === 'DXY' || pair.includes('JPY') ? 3 : 5;
    const baseMap = this.engine1BaseMap(zoneMap);

    const zoneLines = baseMap.map((z, i) => {
      const vlmType = this.engine1TypeToVlm(z.type);
      const name = z.zoneName ?? z.id;
      const zoneTf = z.timeframe ?? '4H';
      const label = z.sdType ?? (z.isBoM ? 'BoM' : 'MoM');
      const lo = z.floor.toFixed(decimals);
      const hi = z.ceiling.toFixed(decimals);
      const question = vlmType === 'SUPPLY'
        ? `Do you see a clear bearish reversal pattern (order block, wick cluster, swing high) at ${lo}-${hi}?`
        : vlmType === 'DEMAND'
          ? `Do you see a clear bullish reversal pattern (order block, wick cluster, swing low) at ${lo}-${hi}?`
          : `Do you see a tight consolidation or wick cluster (resting stop-losses) at ${lo}-${hi}?`;
      return `Zone ${i + 1} [${name}]: ${vlmType} at ${lo}-${hi} (${zoneTf} ${label}, conf=${z.confluence}, reactions=${z.reactionCount})\n  → ${question}`;
    }).join('\n');

    const tfGuidance = tf === '4H'
      ? 'On 4H, a valid S/D zone shows an ORDER BLOCK: the last opposite-color candle before a strong impulsive move away from the level (last BULLISH candle before a strong bearish move = SUPPLY; last BEARISH candle before a strong bullish move = DEMAND). The zone spans that candle\'s range.'
      : `On ${tf}, valid zones show LIQUIDITY signatures: wick clusters (2-4+ candle wick tips at the same level), body edges (3+ candle bodies stopping at the same level), FVG boundaries, or tight consolidations (3-5 candles, ≤25 pips). These are where stop-losses cluster — price is attracted to them.`;

    return `You are looking at a ${pair} TradingView ${tf} chart. Spot: ${spot}

You are a ZONE VALIDATOR, not a zone identifier. Below is the BASE MAP of data-computed zones from Engine 1 analysis (9-pillar S/D + liquidity detection, exact price levels). The base-map zones ARE DRAWN on the chart as colored rectangles — RED = supply, BLUE = demand, GREEN = liquidity (LQZ) — with dashed horizontal lines at each zone's key levels, labelled "[TF] TYPE | BoM/MoM". Judge whether each drawn zone sits on real visible structure at that level. Do NOT identify zones from scratch.

${tfGuidance}

ENGINE 1 BASE MAP (${baseMap.length} zones):
${zoneLines}

For EACH base-map zone above, answer its question:
1. Is this zone VISUALLY REAL on the chart at the stated price level?
2. If YES → confirm it:  CONFIRMED|{TYPE}|{TOP}|{BOTTOM}|{CLASSIFICATION}|{TF}
3. If NO (nothing visible there — data artifact) → reject it:  REJECTED|{ZONE_NAME}

Then list any ADDITIONAL zones you clearly see that are NOT in the base map:
NEW|{TYPE}|{TOP}|{BOTTOM}|{CLASSIFICATION}|{TF}

RESPONSE FORMAT (one verdict per line, no prose):
CONFIRMED|SUPPLY|102.270|102.170|MoM|${tf}
REJECTED|Zone 3
NEW|LIQUIDITY|100.945|100.565|BOSM|${tf}

RULES:
- TYPE = SUPPLY, DEMAND, or LIQUIDITY (LQZ)
- CLASSIFICATION = BoM, MoM, BOSM, or UNMITIGATED
- TOP >= BOTTOM. Use the base-map price levels; tighten them only when the visible structure is clearly narrower.
- Every base-map zone gets exactly one verdict: CONFIRMED or REJECTED.
- TF = ${tf}`;
  }

  /**
   * The Engine 1 base-map slice presented in the prompt. Both the prompt
   * builder and the REJECTED-ref resolver use this SAME slice so positional
   * references ("Zone N") map back to the exact zone the VLM was shown.
   */
  private engine1BaseMap(zoneMap: ZoneMapSnapshot): readonly DXYZone[] {
    return zoneMap.zones.slice(0, 12);
  }

  /**
   * Map an Engine 1 zone type to the VLM-facing validation type. LSZ
   * (liquidity sweep) zones are presented as LQZ; everything else keeps
   * its supply/demand direction.
   */
  private engine1TypeToVlm(type: ZoneType): 'SUPPLY' | 'DEMAND' | 'LQZ' {
    const t = String(type);
    if (t.startsWith('LSZ')) return 'LQZ';
    if (t.includes('Supply')) return 'SUPPLY';
    return 'DEMAND';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VLM ANALYSIS + PARSING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Send a captured timeframe screenshot to the VLM and parse the response.
   *
   * Uses the chartFetch (TvChartImageFetch) VLM send path — opencode SDK
   * client primary, MiMo HTTP safety net — on the EXACT screenshot the
   * telescoping pass captured for this timeframe. NO FALLBACK: throws if the
   * VLM tool is unwired or returns an empty response.
   */
  private async analyzeScreenshot(
    screenshotPath: string,
    prompt: string,
    pair: string,
    tf: string,
  ): Promise<VlmValidationParseResult> {
    // Use the existing chartFetch (TvChartImageFetch) to send to VLM via opencode SDK
    const chartFetch = this.chartFetch;
    if (!chartFetch) {
      throw new Error(`[engine3-vlm] ${pair}: TvChartImageFetch required for VLM analysis. NO FALLBACK.`);
    }

    // Analyze the exact per-TF screenshot captured by the telescoping pass —
    // re-capturing here would detach the image from the TF-specific prompt.
    const analysis = await chartFetch.analyzeScreenshot(screenshotPath, prompt);
    if (!analysis || analysis.markdown.length === 0) {
      throw new Error(`[engine3-vlm] ${pair} ${tf}: VLM returned empty response. NO FALLBACK.`);
    }

    // Parse the validation format: CONFIRMED|… / REJECTED|… / NEW|…
    return this.parseSimplifiedVlmResponse(analysis.markdown, pair, tf);
  }

  /**
   * Parse the VLM validation response into zones + rejection verdicts.
   *
   * Line formats (one verdict per line):
   *   CONFIRMED|TYPE|TOP|BOTTOM|CLASSIFICATION|TF → VLM_CONFIRMED, confidence 85
   *   REJECTED|ZONE_NAME                          → recorded in rejectedZoneRefs
   *   NEW|TYPE|TOP|BOTTOM|CLASSIFICATION|TF       → VLM_NEW, confidence 65
   *
   * Robustness: bare TYPE|TOP|BOTTOM|CLASSIFICATION|TF lines (legacy format,
   * no verdict prefix) are treated as NEW. "LQZ" normalizes to LIQUIDITY.
   * Header lines (#), comments (//), blank lines, unknown types, and
   * non-numeric/invalid prices are skipped. Coordinates are normalized so
   * top >= bottom. validateVisualZones resolves rejected refs and links
   * CONFIRMED zones back to their Engine 1 source for metadata inheritance.
   */
  private parseSimplifiedVlmResponse(markdown: string, pair: string, tf: string): VlmValidationParseResult {
    const zones: VisualSDZone[] = [];
    const rejectedZoneRefs: string[] = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

      const parts = trimmed.split('|').map(s => s.trim());
      const head = parts[0]!.toUpperCase();

      // REJECTED|ZONE_NAME — VLM verdict: Engine 1 zone is a data artifact
      if (head === 'REJECTED') {
        const ref = parts[1];
        if (ref) rejectedZoneRefs.push(ref);
        continue;
      }

      // CONFIRMED|… / NEW|… carry a verdict prefix; bare TYPE|… lines
      // (legacy format) are treated as NEW.
      let verdict: 'CONFIRMED' | 'NEW' = 'NEW';
      let offset = 0;
      if (head === 'CONFIRMED' || head === 'NEW') {
        verdict = head;
        offset = 1;
      }

      if (parts.length < offset + 4) continue;

      const rawType = parts[offset]!.toUpperCase();
      if (rawType !== 'SUPPLY' && rawType !== 'DEMAND' && rawType !== 'LIQUIDITY' && rawType !== 'LQZ') continue;
      const type = (rawType === 'LQZ' ? 'LIQUIDITY' : rawType) as VisualSDZone['type'];

      const top = parseFloat(parts[offset + 1]!);
      const bottom = parseFloat(parts[offset + 2]!);
      if (isNaN(top) || isNaN(bottom) || top <= 0 || bottom <= 0) continue;

      const classification = (parts[offset + 3] ?? 'MoM') as VisualSDZone['classification'];

      // Ensure top >= bottom
      const zoneTop = Math.max(top, bottom);
      const zoneBottom = Math.min(top, bottom);

      zones.push({
        pair,
        type,
        top: zoneTop,
        bottom: zoneBottom,
        timeframe: tf,
        classification,
        source: verdict === 'CONFIRMED' ? 'VLM_CONFIRMED' : 'VLM_NEW',
        mappedIPZoneName: 'UNMAPPED', // set by validator when linked to Engine 1
        mappedShapeDay: 'UNKNOWN',
        confidence: verdict === 'CONFIRMED' ? 85 : 65,
        reactionCount: 0,
        liquidityScore: 5,
      });
    }

    return { zones, rejectedZoneRefs };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE 1 VALIDATION + MULTI-TF MERGE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve VLM verdicts against the Engine 1 zone map.
   *
   * The verdict itself comes from the VLM (not from geometric matching):
   *   - CONFIRMED zones → high confidence (VLM validated against the chart).
   *     Geometric matching (8-pip tolerance) is used ONLY to link the zone
   *     back to its Engine 1 source for metadata inheritance (name,
   *     reaction count, liquidity score).
   *   - NEW zones → medium confidence (VLM found a zone Engine 1 missed).
   *   - REJECTED Engine 1 zones → data artifacts: excluded from inheritance
   *     matching and from setup generation.
   */
  private validateVisualZones(
    vlmZones: VisualSDZone[],
    rejectedZoneRefs: string[],
    zoneMap: ZoneMapSnapshot,
    pair: string,
  ): VisualSDZone[] {
    const pipValue = pair === 'DXY' ? 0.01 : 0.0001;
    const tolerance = 8 * pipValue; // 8 pips tolerance for inheritance matching

    // Resolve REJECTED verdicts to Engine 1 zones — data artifacts excluded
    // from inheritance matching and from setup generation.
    const rejectedIds = new Set<string>();
    for (const ref of rejectedZoneRefs) {
      const ez = this.resolveEngine1ZoneRef(ref, zoneMap);
      if (ez) {
        rejectedIds.add(ez.id);
      } else {
        log.info(`  [engine3-vlm] ${pair}: REJECTED ref "${ref}" matched no Engine 1 base-map zone — ignored`);
      }
    }

    if (rejectedIds.size > 0) {
      log.info(`  [engine3-vlm] ${pair}: ${rejectedIds.size} Engine 1 zone(s) rejected by VLM as data artifacts — excluded from setup generation`);
    }

    const validated: VisualSDZone[] = [];

    for (const vz of vlmZones) {
      // Inheritance match: link the VLM zone back to its (non-rejected)
      // Engine 1 source. This transfers metadata only — the CONFIRMED/NEW
      // verdict itself was made by the VLM.
      const match = zoneMap.zones.find((ez) => {
        if (rejectedIds.has(ez.id)) return false;
        const gap = Math.max(vz.bottom, ez.floor) - Math.min(vz.top, ez.ceiling);
        return gap <= tolerance;
      });

      if (vz.source === 'VLM_CONFIRMED') {
        // VLM validated this zone against the chart → high confidence
        validated.push({
          ...vz,
          confidence: Math.min(95, Math.max(vz.confidence, 85)),
          mappedIPZoneName: match ? (match.zoneName ?? match.id) : vz.mappedIPZoneName,
          reactionCount: match?.reactionCount ?? vz.reactionCount,
          liquidityScore: match?.liquidityScore ?? vz.liquidityScore,
        });
      } else {
        // NEW — VLM found a zone Engine 1 missed → medium confidence
        validated.push({
          ...vz,
          confidence: Math.min(80, vz.confidence),
        });
      }
    }

    return validated;
  }

  /**
   * Resolve a VLM REJECTED reference back to its Engine 1 base-map zone.
   *
   * Accepts the forms the VLM was shown or told to use:
   *   1. Positional: "Zone N" / "zone #N" (1-based index into the base map)
   *   2. Exact zoneName or id (case-insensitive, brackets stripped: "[R1]")
   *   3. Embedded zoneName (e.g. "Zone 3 [R3]" when positional fails)
   */
  private resolveEngine1ZoneRef(ref: string, zoneMap: ZoneMapSnapshot): DXYZone | undefined {
    const baseMap = this.engine1BaseMap(zoneMap);
    const cleaned = ref.trim();

    // 1. Positional reference ("Zone 3") — same 1-based numbering as the prompt
    const idxMatch = /zone\s*#?\s*(\d+)/i.exec(cleaned);
    if (idxMatch) {
      const idx = Number.parseInt(idxMatch[1]!, 10) - 1;
      if (idx >= 0 && idx < baseMap.length) return baseMap[idx];
    }

    // 2. Exact zoneName / id match
    const stripped = cleaned.replace(/[[\]]/g, '').trim().toLowerCase();
    const exact = baseMap.find((z) =>
      (z.zoneName !== undefined && z.zoneName.toLowerCase() === stripped) ||
      z.id.toLowerCase() === stripped
    );
    if (exact) return exact;

    // 3. Embedded zoneName fallback
    return baseMap.find((z) =>
      z.zoneName !== undefined && z.zoneName.length > 0 && stripped.includes(z.zoneName.toLowerCase())
    );
  }

  /**
   * Merge validated zones across timeframes.
   *
   * 4H zones are containers; 1H/30m/15m zones are refinements nested inside
   * them. A zone fully contained in a same-type higher-TF zone keeps its own
   * narrower (LTF) coordinates — zones get NARROWER and snap to LTF wicks as
   * the telescope descends — and earns a +5 refinement confidence bonus
   * (cap 95). Non-nested zones pass through unchanged.
   */
  private mergeMultiTfZones(zones: VisualSDZone[]): VisualSDZone[] {
    // 4H zones are containers. LTF zones are refinements nested inside.
    // Merge by price overlap — narrower TF wins for coordinates.
    const merged: VisualSDZone[] = [];
    const sorted = [...zones].sort((a, b) => {
      // Sort by timeframe priority (4H first) then by bottom price
      const tfOrder: Record<string, number> = { '4H': 0, '1H': 1, '30m': 2, '15m': 3 };
      const tfDiff = (tfOrder[a.timeframe] ?? 4) - (tfOrder[b.timeframe] ?? 4);
      if (tfDiff !== 0) return tfDiff;
      return a.bottom - b.bottom;
    });

    for (const zone of sorted) {
      // Check if this zone is nested inside an existing merged zone
      const parent = merged.find((m) =>
        m.type === zone.type &&
        zone.bottom >= m.bottom && zone.top <= m.top
      );

      if (parent) {
        // LTF refinement — keep the narrower (LTF) coordinates
        // but inherit the parent's classification if higher
        merged.push({
          ...zone,
          confidence: Math.min(95, zone.confidence + 5), // refinement bonus
        });
      } else {
        merged.push(zone);
      }
    }

    return merged;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPTURE-ANALYZE-WEEK WORKFLOW (Engine 3 Core)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Multi-timeframe visual intelligence sweep for a pair (Engine 3 core).
   *
   * Alias for identifyZones(): the multi-TF telescoping pipeline (4H → 1H →
   * 30m → 15m screenshots → per-TF VLM analysis → Engine 1 validation →
   * multi-TF merge) IS the week-capture workflow. Kept as a stable public
   * entry point for callers of the previous implementation.
   *
   * NO FALLBACK: any capture or VLM failure throws (see identifyZones).
   *
   * @returns Merged VisualSDZone array spanning 4H/1H/30m/15m.
   */
  async captureAndAnalyzeWeek(
    pair: string,
    spot: number,
    zoneMap: ZoneMapSnapshot,
    shapePrediction: ShapePredictionSnapshot,
  ): Promise<VisualSDZone[]> {
    const { zones } = await this.identifyZones(pair, spot, zoneMap, shapePrediction);
    return zones;
  }
}
