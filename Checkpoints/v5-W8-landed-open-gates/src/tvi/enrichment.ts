// ═══════════════════════════════════════════════════════════════════
// TVI — ENGINE 1 ENRICHMENT — ZIP PHASE 4
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §6.4 (enrichWithEngine1)
//
// After the harness verifies zones (zip.ts), each validated zone is
// enriched with Engine-1 metadata by matching to the NEAREST Engine-1
// zone: reactionCount, confluence, zfp, liquidityScore,
// mappedIPZoneName. Zones matching an Engine-1 LQZ get a '_LQZ' source
// suffix (VLM_CONFIRMED → VLM_CONFIRMED_LQZ, double-append guarded).
//
// MATCH THRESHOLD (V4.3): an Engine-1 zone must come within 1 pip of
// the validated zone to enrich it. The threshold is measured as the
// INTERVAL GAP between the two price ranges (0 when they overlap) —
// midpoint-to-midpoint distance rejects legitimate matches for wide
// Engine-1 zones whose ranges fully contain the validated zone (and
// contradicts this module's own verification fixture). Ranking among
// in-threshold candidates is by midpoint proximity (spec §6.4 verbatim).
//
// Zones with no in-threshold Engine-1 match are default-filled
// (reactionCount/confluence/liquidityScore 0, zfp from confluence 0,
// mappedIPZoneName '') so the parse-time sentinels never leak
// downstream as NaN.
//
// Deterministic, zero model inference.
// ═══════════════════════════════════════════════════════════════════

import type { ValidatedZone, ZoneSource } from './types.js';

/** Structural subset of an Engine-1 zone (DXYZone) used for enrichment */
export interface Engine1ZoneRef {
  pair: string;
  ceiling: number;
  floor: number;
  zoneName?: string;
  reactionCount?: number;
  confluence?: number;
  liquidityScore?: number;
  sdOverlap?: string;
  sdType?: string;
}

/** Pip size per pair in price units (V4.3 canon: DXY 0.01, FX 0.0001) */
const DEFAULT_PIP_VALUES: Record<string, number> = { DXY: 0.01, default: 0.0001 };

/** Confluence assumed when the matched Engine-1 zone carries none (spec §6.4) */
const FALLBACK_CONFLUENCE = 5;

/**
 * computeZfpFromConfluence — canon Pillar 9 pressure-degree → ZFP step
 * function (Bible Part 4.12), identical to src/pipeline/engine.ts (Wave 1).
 * Step function because confluence bands represent qualitatively different
 * institutional defense regimes — within a band the defense is constant,
 * at band boundaries it jumps.
 */
export function computeZfpFromConfluence(confluence: number): number {
  if (confluence >= 12) return 10; // EXTREME — nearly impregnable
  if (confluence >= 10) return 20; // HEAVY
  if (confluence >= 8) return 30; // MODERATE-HEAVY
  if (confluence >= 6) return 40; // MODERATE
  if (confluence >= 4) return 55; // LIGHT
  return 65; // MINIMAL
}

/** Pip value for a pair: explicit map → pair key → 'default' key → canon default */
function pipValueFor(pair: string, pipValueByPair?: Record<string, number>): number {
  return (
    pipValueByPair?.[pair] ??
    pipValueByPair?.['default'] ??
    DEFAULT_PIP_VALUES[pair] ??
    DEFAULT_PIP_VALUES['default']
  );
}

/**
 * Price gap between two ranges [aBottom, aTop] and [bBottom, bTop].
 * 0 when the ranges overlap or touch; otherwise the distance between
 * the nearest edges.
 */
function intervalGap(aTop: number, aBottom: number, bTop: number, bBottom: number): number {
  return Math.max(0, bBottom - aTop, aBottom - bTop);
}

/**
 * enrichWithEngine1 — spec §6.4. For each validated zone, find the
 * nearest in-threshold Engine-1 zone for the same pair (ranked by
 * midpoint proximity, gated by 1-pip interval gap) and populate the
 * enrichment fields with ??= semantics (agent-set values win). LQZ
 * matches append '_LQZ' to the zone source (double-append guarded).
 *
 * Returns NEW zone objects — the input array is not mutated.
 */
export function enrichWithEngine1(
  validatedZones: ValidatedZone[],
  engine1Zones: Engine1ZoneRef[],
  pipValueByPair?: Record<string, number>,
): ValidatedZone[] {
  return validatedZones.map((vz) => {
    const out: ValidatedZone = { ...vz };
    const zoneMid = (vz.top + vz.bottom) / 2;
    const pip = pipValueFor(vz.pair, pipValueByPair);

    // Nearest Engine-1 zone for this pair within 1 pip (interval gap),
    // ranked by midpoint proximity (spec §6.4 selection rule).
    const nearest = engine1Zones
      .filter((ez) => ez.pair === vz.pair)
      .map((ez) => ({
        ez,
        midDist: Math.abs((ez.ceiling + ez.floor) / 2 - zoneMid),
        gap: intervalGap(vz.top, vz.bottom, ez.ceiling, ez.floor),
      }))
      .filter((c) => c.gap <= pip)
      .sort((a, b) => a.midDist - b.midDist)[0]?.ez;

    if (nearest) {
      // Enrich with Engine-1 metadata (only if not already set by agent)
      out.reactionCount ??= nearest.reactionCount ?? 0;
      out.confluence ??= nearest.confluence ?? 0;
      out.zfp ??= computeZfpFromConfluence(nearest.confluence ?? FALLBACK_CONFLUENCE);
      out.liquidityScore ??= nearest.liquidityScore ?? 0;
      out.mappedIPZoneName ??= nearest.zoneName ?? '';

      // If the Engine-1 zone is an LQZ, mark the validated zone (guard
      // against double-appending on re-enrichment)
      const isLqz = nearest.sdOverlap === 'LQZ' || (nearest.zoneName?.includes('LQZ') ?? false);
      if (isLqz && !out.source.endsWith('_LQZ')) {
        out.source = `${out.source}_LQZ` as ZoneSource;
      }
    } else {
      // No Engine-1 zone within 1 pip — default-fill so the parse-time
      // sentinels never propagate downstream as NaN.
      out.reactionCount ??= 0;
      out.confluence ??= 0;
      out.zfp ??= computeZfpFromConfluence(0);
      out.liquidityScore ??= 0;
      out.mappedIPZoneName ??= '';
    }

    return out;
  });
}
