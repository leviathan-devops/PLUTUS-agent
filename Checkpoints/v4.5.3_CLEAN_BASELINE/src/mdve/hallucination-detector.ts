/**
 * PLUTUS TTE — HALLUCINATION DETECTOR ENGINE (Wave J1)
 *
 * The operator's ruling (2026-08-01, QUOTED):
 *   "bullshit fucking hallucinated reason immediately flag all variations of
 *    this phrase as a hallucination trigger that needs scrupulous 0 trust
 *    auditing. we should build a hallucination detector engine into this as
 *    well that immediately red alerts false model claims like this for all
 *    rejected trades"
 *
 * The trigger table (DEBUG LOG §D34) + the red-alert protocol (FIX PLAN §4).
 * Deterministic. Total (every input → defined output). No empty catch.
 */

/** The trigger phrases — case-insensitive, fuzzy (substring) matched. */
export const TRIGGER_PHRASES: readonly string[] = [
  'candles smaller on this move',
  'candles are smaller',
  'smaller candles',
  'candle size',
  'pair-native re-anchor',
  'pair volatility differs',
  'pair volatility',
  'market moved differently',
  'different market conditions',
  'no valid setup',
  'not enough confluence',
  'no confluence',
  'low volatility',
  'not enough data',
];

/** The mechanical-evidence tokens a legitimate reason must carry (≥3 of these
 *  families, else the reason is a hallucination candidate — FIX PLAN §4.1). */
export interface HallucinationEvidence {
  zoneId?: string;
  price?: number;
  delta?: number;
  layerCheck?: string;
  rungId?: string;
}

export interface HallucinationVerdict {
  triggered: boolean;
  matchedPhrase: string | null;
  reason: string;
}

export interface DetectorStats {
  totalChecked: number;
  triggers: number;
  /** layer → count — where the real causes live (the E3-mechanics feedback). */
  layerCauses: Record<string, number>;
}

let stats: DetectorStats = { totalChecked: 0, triggers: 0, layerCauses: {} };

/** Reset the stats (deterministic per-run — call at pipeline start). */
export function resetDetectorStats(): void {
  stats = { totalChecked: 0, triggers: 0, layerCauses: {} };
}

export function getDetectorStats(): DetectorStats {
  return { ...stats, layerCauses: { ...stats.layerCauses } };
}

/**
 * The catch-all: count how many of the mechanical-evidence families the
 * reason cites. A reason with fewer than 3 is a hallucination candidate.
 */
export function mechanicalEvidenceCount(
  reason: string,
  evidence?: HallucinationEvidence,
): number {
  let count = 0;
  if (evidence?.zoneId && reason.includes(evidence.zoneId)) count++;
  if (evidence?.rungId && reason.includes(evidence.rungId)) count++;
  if (evidence?.price !== undefined) {
    const p = evidence.price.toFixed(4);
    if (reason.includes(p) || reason.includes(evidence.price.toFixed(2))) count++;
  }
  if (evidence?.delta !== undefined && reason.includes(evidence.delta.toFixed(1))) count++;
  if (evidence?.layerCheck && reason.includes(evidence.layerCheck)) count++;
  // price-like tokens in the reason itself (a 4-decimal or 3-decimal number)
  if (/\d+\.\d{3,}/.test(reason)) count++;
  // layer-check tokens (P1-P8 / C1-C6 / T1-T8 / PASS / FAIL)
  if (/\b[PCT][1-8]\b|PASS|FAIL|\bC[1-6]\b/.test(reason)) count++;
  return count;
}

/**
 * The trigger matcher — the red-alert protocol's first stage.
 * TOTAL: any reason → a verdict.
 */
export function detectHallucination(
  reason: string,
  evidence?: HallucinationEvidence,
): HallucinationVerdict {
  stats.totalChecked++;
  const r = (reason ?? '').toLowerCase().trim();
  if (r.length === 0) {
    stats.triggers++;
    return { triggered: true, matchedPhrase: '(empty reason)', reason };
  }
  for (const phrase of TRIGGER_PHRASES) {
    if (r.includes(phrase.toLowerCase())) {
      stats.triggers++;
      return { triggered: true, matchedPhrase: phrase, reason };
    }
  }
  if (mechanicalEvidenceCount(reason, evidence) < 3) {
    stats.triggers++;
    return {
      triggered: true,
      matchedPhrase: '(insufficient mechanical evidence — <3 of zone/price/delta/layer/rung)',
      reason,
    };
  }
  return { triggered: false, matchedPhrase: null, reason };
}

/** Record where the REAL cause lived (the layer feedback for the mechanics). */
export function recordLayerCause(layer: string): void {
  stats.layerCauses[layer] = (stats.layerCauses[layer] ?? 0) + 1;
}

/**
 * The red-alert routing: when a rejection reason triggers, the setup is
 * routed to the 3D machine's full audit. The routing is a FUNCTION of the
 * verdict — the caller (the rejection site) decides whether to invoke
 * auditSetup3D (the heavy machinery lives in refinement-machine.ts).
 * This module keeps the detector pure; the routing happens at the call site
 * via the returned verdict.
 */
export function redAlertMessage(verdict: HallucinationVerdict): string {
  return verdict.triggered
    ? `[HALLUCINATION RED-ALERT] trigger: ${verdict.matchedPhrase} — the reason is a model CLAIM, not a diagnosis. Route to the 3D machine (auditSetup3D) for the mechanical cause.`
    : '';
}
