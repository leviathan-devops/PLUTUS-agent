/**
 * MultiPairTranslator — Part IX 2-layer DXY-to-forex translation system.
 *
 * Layer 1 (Structural Equivalence):
 *   DXY is the dollar index. A strong dollar (DXY up) means weak forex pairs.
 *   DXY resistance zone (above spot) -> forex pair SUPPORT zone (below spot)
 *   DXY support zone (below spot) -> forex pair RESISTANCE zone (above spot)
 *   The pair provides its OWN price levels. What translates is the STRUCTURE.
 *
 * Layer 2 (Cross-Validation):
 *   For each translated zone, check if the pair's own data confirms it:
 *   - Does the pair's MA confluence cluster sit near the translated level?
 *   - Does the pair's structural extreme confirm the direction?
 *   - Does the analyst consensus bias agree?
 *
 * FIX-005 / GAP-005 — CRITICAL. Depends on FIX-004 (needs per-pair data).
 */

import { ZoneType } from '../types.js';
import type { DXYZone, OHLCBar } from '../types.js';
import type { PairDataBundle } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('MultiPairTranslator');

// ── Types ──

export type TranslationDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface TranslatedZone {
  pair: string;
  originalDxyZone: DXYZone;
  translatedDirection: TranslationDirection;
  translatedLevel: number;
  pairSource: string;
  crossValidationScore: number;   // 0.0-1.0
  crossValidationChecks: CrossValidationCheck[];
}

export interface CrossValidationCheck {
  name: string;
  result: 'CONFIRM' | 'CONFLICT' | 'NEUTRAL';
  detail: string;
}

export interface TranslationResult {
  pair: string;
  dxyDirection: TranslationDirection;
  translatedZones: TranslatedZone[];
  averageConfidence: number;
}

/** Cross-pair comparison matrix: rows = DXY zones, cols = forex pairs. */
export interface CrossPairMatrix {
  pairs: string[];
  rows: Array<{
    dxyZone: DXYZone;
    cells: Array<{ pair: string; direction: TranslationDirection; level: number; confidence: number }>;
  }>;
}

// ── Engine ──

export class MultiPairTranslator {

  translate(
    dxyZones: DXYZone[],
    pair: string,
    pairData: PairDataBundle,
  ): TranslationResult {

    if (pair === 'DXY') {
      throw new Error('Cannot translate DXY to DXY');
    }

    // ── Layer 1: Structural Equivalence ──
    const dxyDirection = this.assessDxyDirection(dxyZones);
    log.info(`[${pair}] DXY direction: ${dxyDirection} -> pair direction: ${this.invertDirection(dxyDirection)}`);

    const translatedZones: TranslatedZone[] = [];

    for (const dxyZone of dxyZones) {
      const translatedDir = this.invertZoneDirection(dxyZone, dxyDirection);
      const pairLevel = this.findPairLevel(dxyZone, translatedDir, pairData);

      if (pairLevel.level === null) {
        log.debug(`[${pair}] No pair level found for DXY zone at ${dxyZone.floor}-${dxyZone.ceiling}`);
        continue;
      }

      // ── Layer 2: Cross-Validation ──
      const checks = this.crossValidate(pairLevel.level, translatedDir, pairData);
      const score = this.computeCrossValScore(checks);

      translatedZones.push({
        pair,
        originalDxyZone: dxyZone,
        translatedDirection: translatedDir,
        translatedLevel: pairLevel.level,
        pairSource: pairLevel.source,
        crossValidationScore: score,
        crossValidationChecks: checks,
      });
    }

    const avgConfidence = translatedZones.length > 0
      ? translatedZones.reduce((sum: number, z: TranslatedZone) => sum + z.crossValidationScore, 0) / translatedZones.length
      : 0;

    log.info(`[${pair}] Translated ${translatedZones.length} zones, avg confidence=${avgConfidence.toFixed(2)}`);

    return { pair, dxyDirection, translatedZones, averageConfidence: avgConfidence };
  }

  /**
   * Translate DXY zones to ALL forex pairs and produce a cross-pair comparison matrix.
   */
  translateAll(
    dxyZones: DXYZone[],
    pairDataMap: Map<string, PairDataBundle>,
  ): { results: TranslationResult[]; matrix: CrossPairMatrix } {
    const results: TranslationResult[] = [];
    const forexPairs = Array.from(pairDataMap.keys()).filter((p: string) => p !== 'DXY');

    for (const pair of forexPairs) {
      const data = pairDataMap.get(pair);
      if (!data) {
        log.warn(`No per-pair data for ${pair} — skipping translation`);
        continue;
      }
      try {
        results.push(this.translate(dxyZones, pair, data));
      } catch (e) {
        log.error(`Translation failed for ${pair}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Build cross-pair matrix
    const matrix = this.buildMatrix(dxyZones, results);

    log.info(
      `Cross-pair matrix: ${matrix.rows.length} DXY zones x ${matrix.pairs.length} pairs. ` +
      `Pairs: ${matrix.pairs.join(', ')}`
    );

    return { results, matrix };
  }

  private buildMatrix(dxyZones: DXYZone[], results: TranslationResult[]): CrossPairMatrix {
    const pairs = results.map((r: TranslationResult) => r.pair);
    const rows = dxyZones.map((dxyZone: DXYZone) => {
      const cells = results.map((r: TranslationResult) => {
        const tz = r.translatedZones.find((z: TranslatedZone) => z.originalDxyZone.id === dxyZone.id);
        return {
          pair: r.pair,
          direction: tz?.translatedDirection ?? 'NEUTRAL',
          level: tz?.translatedLevel ?? 0,
          confidence: tz?.crossValidationScore ?? 0,
        };
      });
      return { dxyZone, cells };
    });
    return { pairs, rows };
  }

  private assessDxyDirection(zones: DXYZone[]): TranslationDirection {
    const resistanceCount = zones.filter((z: DXYZone) => this.isResistance(z.type)).length;
    const supportCount = zones.filter((z: DXYZone) => this.isSupport(z.type)).length;
    if (resistanceCount > supportCount) return 'BEARISH';
    if (supportCount > resistanceCount) return 'BULLISH';
    return 'NEUTRAL';
  }

  private isResistance(type: ZoneType): boolean {
    return type === ZoneType.BOM_SUPPLY || type === ZoneType.MOM_SUPPLY ||
           type === ZoneType.LSZ_SUPPLY || type === ZoneType.IP_SUPPLY;
  }

  private isSupport(type: ZoneType): boolean {
    return type === ZoneType.BOM_DEMAND || type === ZoneType.MOM_DEMAND ||
           type === ZoneType.LSZ_DEMAND || type === ZoneType.IP_DEMAND;
  }

  private invertDirection(dir: TranslationDirection): TranslationDirection {
    if (dir === 'BULLISH') return 'BEARISH';
    if (dir === 'BEARISH') return 'BULLISH';
    return 'NEUTRAL';
  }

  private invertZoneDirection(dxyZone: DXYZone, dxyDir: TranslationDirection): TranslationDirection {
    if (this.isResistance(dxyZone.type)) return 'BULLISH';
    if (this.isSupport(dxyZone.type)) return 'BEARISH';
    return this.invertDirection(dxyDir);
  }

  private findPairLevel(
    dxyZone: DXYZone,
    dir: TranslationDirection,
    pairData: PairDataBundle,
  ): { level: number | null; source: string } {
    if (pairData.ohlc.length > 0) {
      const recent90 = pairData.ohlc.slice(-90);
      const swingHigh = Math.max(...recent90.map((b: OHLCBar) => b.high));
      const swingLow = Math.min(...recent90.map((b: OHLCBar) => b.low));
      if (dir === 'BEARISH') return { level: swingHigh, source: 'structural_extreme_high' };
      if (dir === 'BULLISH') return { level: swingLow, source: 'structural_extreme_low' };
    }
    if (pairData.barchartMAs) {
      const ma = dir === 'BEARISH' ? pairData.barchartMAs.ema200 : pairData.barchartMAs.ema50;
      return { level: ma, source: `barchart_ema${dir === 'BEARISH' ? 200 : 50}` };
    }
    return { level: null, source: 'none' };
  }

  private crossValidate(
    level: number,
    dir: TranslationDirection,
    pairData: PairDataBundle,
  ): CrossValidationCheck[] {
    const checks: CrossValidationCheck[] = [];

    // Check 1: MA confluence
    if (pairData.barchartMAs) {
      const mas = [pairData.barchartMAs.ema20, pairData.barchartMAs.ema50, pairData.barchartMAs.ema200];
      const nearMa = mas.some((ma: number) => level !== 0 && Math.abs(ma - level) / level < 0.002);
      checks.push({
        name: 'MA Confluence',
        result: nearMa ? 'CONFIRM' : 'NEUTRAL',
        detail: nearMa ? 'MA cluster within 0.2% of translated level' : 'No MA cluster nearby',
      });
    }

    // Check 2: Structural extreme
    if (pairData.ohlc.length > 30) {
      const recent = pairData.ohlc.slice(-30);
      const recentHigh = Math.max(...recent.map((b: OHLCBar) => b.high));
      const recentLow = Math.min(...recent.map((b: OHLCBar) => b.low));
      const confirmsStructure = dir === 'BEARISH' ? level >= recentHigh * 0.999 : level <= recentLow * 1.001;
      checks.push({
        name: 'Structural Extreme',
        result: confirmsStructure ? 'CONFIRM' : 'CONFLICT',
        detail: confirmsStructure ? 'Level aligns with recent swing extreme' : 'Level conflicts with recent structure',
      });
    }

    // Check 3: Analyst consensus
    if (pairData.analystConsensus) {
      const biasAgrees =
        (dir === 'BULLISH' && pairData.analystConsensus.bias === 'bullish') ||
        (dir === 'BEARISH' && pairData.analystConsensus.bias === 'bearish');
      checks.push({
        name: 'Analyst Consensus',
        result: biasAgrees ? 'CONFIRM' : pairData.analystConsensus.bias === 'neutral' ? 'NEUTRAL' : 'CONFLICT',
        detail: `Analyst bias: ${pairData.analystConsensus.bias}`,
      });
    }

    return checks;
  }

  private computeCrossValScore(checks: CrossValidationCheck[]): number {
    if (checks.length === 0) return 0.5;
    const confirms = checks.filter((c: CrossValidationCheck) => c.result === 'CONFIRM').length;
    const conflicts = checks.filter((c: CrossValidationCheck) => c.result === 'CONFLICT').length;
    return Math.max(0.1, Math.min(1.0, 0.5 + confirms * 0.2 - conflicts * 0.2));
  }
}
