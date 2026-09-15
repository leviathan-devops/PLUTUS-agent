// ═══════════════════════════════════════════════════════════════════
// TVI — ZONE IDENTIFICATION PROTOCOL (ZIP) — HARNESS SIDE
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §6 (ZIP) + §13.2 (ZONE| format)
//
// The agent PERCEIVES (reads chart screenshots, emits ZONE| lines).
// This module is the harness DECIDE/VERIFY side — deterministic, zero
// model inference:
//   Phase 2 (agent): ZONE_PROMPT_TEMPLATE — the canonical operator-tuned
//                    identification prompt (spec §6.2 verbatim).
//   Phase 3 (harness): parseZoneLines — split/parse ZONE| lines into
//                    ValidatedZone objects; verifyZone — the 8-gate
//                    deterministic verification (spec §6.3, in order).
//
// FIELD-ORDER NOTE (spec reconciliation): §13.2 labels fields 3/4 as
// "top"/"bottom", but EVERY example line in the spec (§6.2 EXAMPLE
// OUTPUT, §13.2 Examples) emits LOWER price first, UPPER price second
// (e.g. ZONE|SUPPLY|101.14|101.19). The §6.2 prompt's EXAMPLE OUTPUT is
// what the agent imitates, so the wire format is lower|upper. The
// parser maps parts[2]→bottom, parts[3]→top so verifyZone's structural
// gate (top > bottom) validates the spec's own example lines and
// rejects high-first inversions.
//
// W7 SCAFFOLD VERDICT FORMAT (NEXT_STEPS §1.2 / CODEX §11): the ZONE|
// protocol extends with a verdict field — the agent VERIFIES each
// deterministic scaffold rung instead of INVENTING zones:
//   ZONE|verdict|type|top|bottom|timeframe|classification|confidence|evidence[|source]
// where verdict = CONFIRMED | REJECTED | WEAK. Verdict lines shift every
// field right by one (parts[2]=type … parts[9]=optional source). Legacy
// lines (parts[1]=type) parse EXACTLY as before — format detection is on
// parts[1] being a verdict token. For verdict lines, confidence = the
// agent's certainty IN ITS VERDICT, not zone strength (a certain
// rejection belongs at 60-75 — enforced by the VERDICT_CONSISTENCY gate).
//
// ENRICHMENT SENTINELS: reactionCount/confluence/zfp/liquidityScore/
// mappedIPZoneName are initialized to `undefined` (cast) so that
// enrichWithEngine1's ??= semantics populate them (spec §6.4). They
// must NEVER be read before enrichment — enrichment also default-fills
// unmatched zones, so post-enrichment the fields are always numeric.
//
// SPOT: verifyZone takes spot explicitly. parseZoneLines accepts an
// optional spot — when omitted, the DISTANCE gate is skipped (the
// caller has no proximity context). The pipeline wiring passes the
// harvested spot for the pair.
// ═══════════════════════════════════════════════════════════════════

import { existsSync } from 'node:fs';
import type {
  ValidatedZone,
  ZoneClassification,
  ZoneSource,
  ZoneType,
  ZoneVerdict,
  ZoneVerification,
} from './types.js';
import { GENERIC_EVIDENCE_PATTERNS } from './types.js';

/** Result of parsing an agent response into verified zones */
export interface ZoneParseResult {
  /** Zones that passed ALL verifyZone gates */
  zones: ValidatedZone[];
  /** ZONE| lines that failed parsing or verification, with reasons */
  rejected: Array<{ line: string; reason: string }>;
}

/** Valid zone types (spec §13.2 / B-018) */
const VALID_TYPES: readonly ZoneType[] = ['SUPPLY', 'DEMAND', 'LIQUIDITY'];

/** Valid timeframes (spec §13.2 / B-017) */
const VALID_TIMEFRAMES: readonly ValidatedZone['timeframe'][] = ['4H', '1H', '30m', '15m'];

/** Valid classifications (spec §13.2 / B-019) */
const VALID_CLASSIFICATIONS: readonly ZoneClassification[] = ['BoM', 'MoM', 'UNMITIGATED'];

/** Valid verdicts (W7 scaffold — NEXT_STEPS §1.2 / CODEX §11) */
const VALID_VERDICTS: readonly ZoneVerdict[] = ['CONFIRMED', 'REJECTED', 'WEAK'];

/** Distance gate: ±2.00 points for DXY, ±0.020 (200 pips) for FX (spec §6.3 / B-006/B-007) */
const DXY_MAX_DIST = 2.0;
const FX_MAX_DIST = 0.02;

/** Evidence gates: minimum length and required price reference (spec §6.3 / B-002/B-003) */
const EVIDENCE_MIN_LEN = 20;
const PRICE_REF_RE = /\d+\.\d{3,}/;

/**
 * extractZonesFromText — return just the ZONE| lines from arbitrary agent text.
 * Lines are trimmed before the prefix test (agent prose may indent); the
 * returned lines are the trimmed originals.
 */
export function extractZonesFromText(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('ZONE|'));
}

/**
 * parseZoneLines — spec §6.3 Phase 3. Split the agent response on newlines,
 * filter ZONE| lines, parse fields (≥7 parts required, else reject with
 * reason), build a ValidatedZone per line, run verifyZone on each, and
 * return passing zones plus the rejected list with reasons.
 *
 * Field map (wire format is lower|upper — see header note):
 *   LEGACY: parts[0] "ZONE" | parts[1] type | parts[2] bottom | parts[3] top |
 *     parts[4] timeframe | parts[5] classification | parts[6] confidence |
 *     parts[7] evidence | parts[8] optional explicit source ("VLM_NEW")
 *   VERDICT (W7): parts[0] "ZONE" | parts[1] verdict | parts[2] type |
 *     parts[3]/[4] prices (order-agnostic min/max) | parts[5] timeframe |
 *     parts[6] classification | parts[7] confidence | parts[8] evidence |
 *     parts[9] optional explicit source ("VLM_NEW")
 * Detection: parts[1] trimmed/uppercased ∈ VALID_VERDICTS → verdict format.
 */
export function parseZoneLines(
  agentResponse: string,
  pair: string,
  screenshotPath: string,
  spot?: number,
): ZoneParseResult {
  const zoneLines = extractZonesFromText(agentResponse);
  const zones: ValidatedZone[] = [];
  const rejected: Array<{ line: string; reason: string }> = [];

  for (const line of zoneLines) {
    const parts = line.split('|');
    if (parts.length < 7) {
      rejected.push({
        line,
        reason: `malformed ZONE line (need ≥7 parts, got ${parts.length})`,
      });
      continue;
    }

    // W7 verdict-format detection: if parts[1] is a verdict token, the line
    // is the NEW scaffold verdict format and every field shifts right by one.
    const maybeVerdict = (parts[1] ?? '').trim().toUpperCase();
    const isVerdictLine = (VALID_VERDICTS as readonly string[]).includes(maybeVerdict);
    if (isVerdictLine && parts.length < 9) {
      rejected.push({
        line,
        reason: `malformed verdict ZONE line (need ≥9 parts, got ${parts.length})`,
      });
      continue;
    }
    const verdict: ZoneVerdict | undefined = isVerdictLine
      ? (maybeVerdict as ZoneVerdict)
      : undefined;
    // Field offset: verdict lines carry the verdict in parts[1], so all
    // subsequent fields sit one index higher than the legacy layout.
    const off = isVerdictLine ? 1 : 0;

    const rawType = (parts[1 + off] ?? '').trim().toUpperCase() as ZoneType;
    // Wire format per spec §6.2 EXAMPLE OUTPUT: field 3 = lower, field 4 = upper.
    // ORDER-AGNOSTIC price parsing (Phase 7 container evidence): the ZONE|
    // label says "top|bottom" (so agents write HIGH first: 101.57|101.50),
    // while every spec example line emits LOWER first (101.14|101.19).
    // Both conventions are in the wild — the parser accepts both by taking
    // top = max(a, b), bottom = min(a, b). Equal values are degenerate
    // (zero-width zone) and fall through to the structure gate's top>bottom
    // check, which rejects them with a clear reason.
    const priceA = parseFloat(parts[2 + off]);
    const priceB = parseFloat(parts[3 + off]);
    const bottom = Math.min(priceA, priceB);
    const top = Math.max(priceA, priceB);

    const rawTf = (parts[4 + off] ?? '').trim() as ValidatedZone['timeframe'];
    const timeframe = VALID_TIMEFRAMES.includes(rawTf) ? rawTf : '4H';

    const rawClass = (parts[5 + off] ?? '').trim() as ZoneClassification;
    const classification = VALID_CLASSIFICATIONS.includes(rawClass) ? rawClass : 'UNMITIGATED';

    // For verdict lines, confidence = the agent's certainty IN ITS VERDICT,
    // not zone strength (a certain rejection belongs at 60-75).
    const confidence = parseFloat(parts[6 + off]) || 60;
    const visualEvidence = (parts[7 + off] ?? '').trim();

    // Source: spec §6.3 defaults VLM_CONFIRMED; an explicit trailing field of
    // "VLM_NEW" marks agent-discovered zones not drawn by Engine 1 / the
    // scaffold (verdict lines: 10th field; legacy lines: 9th field). The
    // scaffold-matching provenance upgrade happens later in the setups tool.
    const source: ZoneSource =
      (parts[8 + off] ?? '').trim().toUpperCase() === 'VLM_NEW' ? 'VLM_NEW' : 'VLM_CONFIRMED';

    const zone: ValidatedZone = {
      pair,
      type: rawType,
      top,
      bottom,
      timeframe,
      classification,
      source,
      confidence,
      visualEvidence,
      verdict,
      sourceScreenshot: screenshotPath,
      // Enrichment sentinels — populated by enrichWithEngine1 (??= semantics)
      reactionCount: undefined as unknown as number,
      confluence: undefined as unknown as number,
      zfp: undefined as unknown as number,
      liquidityScore: undefined as unknown as number,
      mappedIPZoneName: undefined as unknown as string,
    };

    // HARNESS VERIFICATION (deterministic, zero model inference)
    const verification = verifyZone(zone, pair, spot ?? NaN);
    if (verification.passed) {
      zones.push(zone);
    } else {
      rejected.push({
        line,
        reason: `[${verification.gate}] ${verification.reason}`,
      });
    }
  }

  return { zones, rejected };
}

/**
 * verifyZone — spec §6.3, the EXACT 8 gates IN ORDER (structure before
 * evidence before distance). Returns the first failing gate, or a pass
 * derived from all gates clearing. Gate order:
 *   (1) STRUCTURE           top > bottom (and both finite)
 *   (2) TYPE                SUPPLY | DEMAND | LIQUIDITY
 *   (3) EVIDENCE_LENGTH     ≥ 20 chars
 *   (4) EVIDENCE_PRICE_REF  /\d+\.\d{3,}/ present
 *   (5) EVIDENCE_GENERIC    not an exact generic string (types.ts canon list)
 *   (6) DISTANCE            zone midpoint within ±200p FX / ±2.00 DXY of spot
 *                           (skipped when spot is not finite)
 *   (7) SCREENSHOT          sourceScreenshot exists on disk (error-guarded)
 *   (8) ENTRY_TYPE          S/D BoM/MoM, LIQUIDITY, or UNMITIGATED classification
 *   (9) VERDICT_CONSISTENCY verdict lines only — REJECTED with confidence ≥ 80
 *                           is contradictory (confidence = certainty in the
 *                           verdict; a certain rejection belongs at 60-75)
 *
 * REJECTED zones are NOT dropped — they pass verification like any other
 * zone and are returned in `zones`; the setups tool decides their Law-14
 * pass-through role. All evidence gates apply to ALL verdicts — a REJECTED
 * verdict must still carry specific evidence (e.g. "no reaction at 101.190 —
 * three consecutive closes through without wick rejection").
 */
export function verifyZone(zone: ValidatedZone, pair: string, spot: number): ZoneVerification {
  const failure = firstGateFailure(zone, pair, spot);
  const passed = failure === null;
  return passed ? { passed, gate: 'ALL', reason: '' } : failure;
}

/** Evaluate the 8 gates in spec order; return the first failure, or null. */
function firstGateFailure(
  zone: ValidatedZone,
  pair: string,
  spot: number,
): ZoneVerification | null {
  // (1) Structure: top > bottom
  if (!Number.isFinite(zone.top) || !Number.isFinite(zone.bottom)) {
    return {
      passed: false,
      gate: 'STRUCTURE',
      reason: `non-numeric boundary (top=${zone.top}, bottom=${zone.bottom})`,
    };
  }
  if (zone.top <= zone.bottom) {
    return {
      passed: false,
      gate: 'STRUCTURE',
      reason: `top (${zone.top}) <= bottom (${zone.bottom})`,
    };
  }

  // (2) Type valid
  if (!VALID_TYPES.includes(zone.type)) {
    return { passed: false, gate: 'TYPE', reason: `invalid type: ${zone.type}` };
  }

  // (3) Evidence: ≥ 20 chars
  if (zone.visualEvidence.length < EVIDENCE_MIN_LEN) {
    return { passed: false, gate: 'EVIDENCE_LENGTH', reason: 'evidence < 20 chars' };
  }

  // (4) Evidence: has price reference (3+ decimals)
  if (!PRICE_REF_RE.test(zone.visualEvidence)) {
    return {
      passed: false,
      gate: 'EVIDENCE_PRICE_REF',
      reason: 'no price reference in evidence',
    };
  }

  // (5) Evidence: not generic (exact-match, lowercased — canon list from types.ts)
  const evidenceLower = zone.visualEvidence.toLowerCase();
  if (GENERIC_EVIDENCE_PATTERNS.some((g) => evidenceLower === g)) {
    return {
      passed: false,
      gate: 'EVIDENCE_GENERIC',
      reason: `generic evidence: "${zone.visualEvidence}"`,
    };
  }

  // (6) Distance: within ±200 pips FX / ±2.00 DXY of spot (skipped without spot)
  if (Number.isFinite(spot)) {
    const zoneMid = (zone.top + zone.bottom) / 2;
    const maxDist = pair === 'DXY' ? DXY_MAX_DIST : FX_MAX_DIST;
    if (Math.abs(zoneMid - spot) > maxDist) {
      return {
        passed: false,
        gate: 'DISTANCE',
        reason: `zone at ${zoneMid} too far from spot ${spot} (max ${maxDist})`,
      };
    }
  }

  // (7) Screenshot exists (fs access guarded — a filesystem error = missing)
  let screenshotExists = false;
  try {
    screenshotExists = existsSync(zone.sourceScreenshot);
  } catch {
    screenshotExists = false;
  }
  if (!screenshotExists) {
    return {
      passed: false,
      gate: 'SCREENSHOT',
      reason: `screenshot not found: ${zone.sourceScreenshot}`,
    };
  }

  // (8) Zone type appropriate for entry (S/D BoM/MoM, LIQUIDITY, or UNMITIGATED)
  const isSdZone = zone.classification === 'BoM' || zone.classification === 'MoM';
  const isLqzZone = zone.type === 'LIQUIDITY';
  if (!isSdZone && !isLqzZone && zone.classification !== 'UNMITIGATED') {
    return {
      passed: false,
      gate: 'ENTRY_TYPE',
      reason: `not S/D or LQZ zone (classification: ${zone.classification})`,
    };
  }

  // (9) VERDICT_CONSISTENCY — verdict lines only. For verdict lines,
  // confidence = the agent's certainty IN ITS VERDICT, not zone strength:
  // a certain rejection belongs at 60-75, so REJECTED at ≥80 is contradictory.
  if (zone.verdict === 'REJECTED' && zone.confidence >= 80) {
    return {
      passed: false,
      gate: 'VERDICT_CONSISTENCY',
      reason:
        'REJECTED verdict with confidence ≥ 80 is contradictory (confidence = certainty in the verdict; a certain rejection belongs at 60-75)',
    };
  }

  return null;
}

/**
 * ZONE_PROMPT_TEMPLATE — the canonical agent-facing zone identification
 * prompt, spec §6.2 VERBATIM (operator-tuned). {PAIR} → pair, {spot} → spot.
 * The charts tool and Manual Step D wiring import this — do not paraphrase.
 */
export function ZONE_PROMPT_TEMPLATE(pair: string, spot: number): string {
  return `You ARE PLUTUS TTE, a trading expert with 37 fundamental laws.
You have just drawn Engine 1 zones on a ${pair} chart and captured a screenshot.
Read this screenshot with read() and identify ALL supply, demand, and liquidity zones near current price (spot: ${spot}).

For each zone, write EXACTLY this format (one per line):
ZONE|type|top|bottom|timeframe|classification|confidence|evidence

Where:
- type: SUPPLY or DEMAND or LIQUIDITY
- top/bottom: exact price levels from the chart's price axis (right side of chart — the numbers)
- timeframe: 4H
- classification: BoM or MoM or UNMITIGATED
- confidence: 0-100 (how clearly you can see this zone)
- evidence: specific candlestick pattern with exact prices (e.g. "bearish engulfing at 1.1480 with 3 upper wicks rejecting from 1.1500")

List at least 5 zones per pair. Both supply AND demand required.

WHAT TO LOOK FOR (from SMC_Master_Notes):

1. ORDER BLOCKS (the most important pattern):
   - Find a drastic and sharp price move (inefficiency)
   - Identify the candle BEFORE the move
   - Mark the high and low of that candle's wicks to form an OB zone
   - Must create break of structure (higher high or lower low)
   - One time use: unmitigated (price HAS NOT retested since formation) = strongest
   - Look for OBs that are pushing price in the current trend direction

2. SUPPLY zones (price rejected DOWN):
   - Bearish order blocks: candle before sharp move down
   - Upper wick clusters: 3+ candles rejecting the SAME high
   - Bearish engulfing at resistance: current candle body engulfs prior
   - Consolidation tops: price touched ceiling and reversed
   - Double top with liquidity sweep above

3. DEMAND zones (price rejected UP):
   - Bullish order blocks: candle before sharp move up
   - Lower wick clusters: 3+ candles rejecting the SAME low
   - Bullish engulfing at support: current candle body engulfs prior
   - Consolidation bottoms: price touched floor and bounced
   - Double bottom with liquidity sweep below

4. LIQUIDITY zones (stop-hunt/sweep areas):
   - Long wicks where price spiked through a level then reversed
   - Just beyond visible swing highs/lows or round numbers
   - Smart money traps at chart patterns (double top above liquidity, double bottom below liquidity)
   - Trendline break liquidity traps

5. CONFIRM drawn zones:
   - The colored rectangles on the chart are Engine 1 zones
   - If a rectangle ALIGNS with a real candlestick pattern, mark VLM_CONFIRMED with confidence 70+
   - If a rectangle does NOT align with any pattern, mark confidence 30 (weak)

6. FIND NEW ZONES (VLM_NEW):
   - Also identify zones you can SEE that were NOT drawn by Engine 1
   - These are zones the Engine 1 analysis missed
   - Actively hunt for them — they are often the best entries
   - Look for unmitigated order blocks and liquidity sweeps that weren't in the Engine 1 output

7. UNMITIGATED zones get priority:
   - Zones price has NOT retested since formation are the strongest entries
   - Check: has any candle entered the zone since it formed? If not, it's unmitigated.

DO NOT:
- Use plutus-omni-vision (that is for VIDEO only)
- Try to read base64 text (read() on .png renders the image directly)
- Write generic evidence ("zone confirmed", "looks good", "valid zone", "order block" without specifics) — describe the EXACT pattern with EXACT prices
- Skip pairs — ALL 4 pairs required
- Only look at one side — you MUST find both supply AND demand zones
- Just confirm rectangles — look for the actual candlestick patterns behind them

EXAMPLE OUTPUT (for DXY at spot 100.95):
ZONE|SUPPLY|101.14|101.19|4H|MoM|85|bearish engulfing at 101.150 with 3 consecutive upper wicks rejecting from 101.190 supply zone
ZONE|SUPPLY|101.23|101.24|4H|BoM|90|bearish order block at 101.235 with strong body covering 70% of range, break of structure below 101.190
ZONE|DEMAND|100.84|100.95|4H|MoM|80|bullish engulfing at 100.945 with double-bottom wick rejection from 100.845 demand
ZONE|DEMAND|100.67|100.80|4H|BoM|75|bullish order block at 100.667 with break of structure above 100.920, unmitigated
ZONE|LIQUIDITY|100.97|100.98|4H|MoM|85|liquidity sweep at 100.975 with long lower wick through 100.945 then sharp reversal up 25 pips in 2 bars`;
}

/**
 * SCAFFOLD_VERDICT_PROMPT_TEMPLATE — the W7 verdict-flow agent prompt
 * (NEXT_STEPS §1.2 / CODEX §11). The harness draws the DETERMINISTIC
 * SCAFFOLD (candidate rungs computed from THIS week's own data) on the
 * charts; the agent's job INVERTS from open-ended zone INVENTION to
 * closed-ended rung VERIFICATION: for each drawn rung, PERCEIVE whether
 * the level is actually reacting and emit ONE verdict line.
 *
 * ZONE_PROMPT_TEMPLATE stays untouched as the legacy fallback.
 *
 * Structural typing on purpose: the caller passes ScaffoldRung[] from
 * ../engines/ladder-scaffold.js (built in parallel) which satisfies this
 * shape — do NOT import it here.
 */
export function SCAFFOLD_VERDICT_PROMPT_TEMPLATE(
  pair: string,
  spot: number,
  rungs: Array<{
    price: number;
    top: number;
    bottom: number;
    type: string;
    timeframe: string;
    source: string;
    classification: string;
    zfp: number;
  }>,
): string {
  const rungList = rungs
    .map(
      (r, i) =>
        `#${i + 1} ${r.type} ${r.bottom}-${r.top} (${r.timeframe} ${r.source}, zfp ${r.zfp})`,
    )
    .join('\n');

  return `You ARE PLUTUS TTE. The chart shows the DETERMINISTIC SCAFFOLD — ${rungs.length} candidate rungs for ${pair} computed from THIS week's data (multi-TF order blocks, LQZ rungs, pivot/MA/options pillars, week-range Fib retracements, prior-week/day swing extremes). Spot: ${spot}.

THE SCAFFOLD RUNGS:
${rungList}

These rectangles are drawn on your chart.

THE TASK — VERIFICATION, NOT INVENTION:
Your job is VERIFICATION, not invention. FOR EACH numbered rung, PERCEIVE the chart at that level and emit EXACTLY ONE verdict line:
ZONE|verdict|type|top|bottom|timeframe|classification|confidence|evidence

Where:
- verdict: CONFIRMED (the level is visibly reacting — wick cluster / engulfing / sweep at the level),
  REJECTED (price ignores it — closes through without reaction), or WEAK (marginal, ambiguous evidence)
- type/top/bottom/timeframe: copy them from the rung's OWN entry in the list above
- classification: UNMITIGATED if no candle has entered the zone since formation, else BoM/MoM per the structure
- confidence: your certainty IN THE VERDICT (a certain rejection = 60-75, NOT 80+)
- evidence: the SPECIFIC candle evidence at the level with EXACT prices
  (e.g. "3 upper wicks rejecting from 101.190", "bullish engulfing at 100.945",
  "two closes through 101.140 with no wick rejection — level not defended")

FRESHNESS RULE:
State freshness in the evidence: UM (untouched since formation) / 1x / 2x / pierced.
If the rung's recorded reaction history contradicts what you see (e.g. rung shows 2 prior
reactions but you see a clean UNMITIGATED level), use WEAK and say why.

OFF-SCAFFOLD ZONES:
If you see a STRONG zone that is NOT in the scaffold list (an unmitigated order block or
liquidity sweep the computation missed), add it as an extra line with verdict=CONFIRMED
and a 10th field VLM_NEW. Maximum 3 off-scaffold additions per pair — the scaffold is the
primary map.

EVERY RUNG NEEDS A VERDICT:
You MUST emit one verdict line for EVERY numbered rung (all ${rungs.length}). Skipped rungs
are recorded as UNVERIFIED — they weaken your own setup map.

GOD-VISION PERCEPTION GUIDE (how to read each level):
- SWEEP FIRST: a long wick poking through the rung and closing back inside = liquidity
  event at the level — strong CONFIRMED evidence for LIQUIDITY rungs.
- TERMINAL BODY CLUSTERS: 2-4 overlapping candle BODIES at the rung before a displacement
  candle = BoM structure defending the level.
- MID-LEG SHELVES: a tight consolidation at the rung inside an established leg, left
  behind unmitigated = MoM structure.
- WICK-CLUSTER RUNGS: ≥2 candles' wicks/bodies aligning at the level within ~1-2 pips =
  the level is defended — CONFIRMED if the cluster is fresh.
- MITIGATED vs UNMITIGATED: price traded through and closed beyond the rung = mitigated
  (REJECTED or WEAK depending on reaction quality). Untested since formation = unmitigated
  (strongest CONFIRMED candidate).

DO NOT:
- Use plutus-omni-vision (that is for VIDEO only)
- Try to read base64 text (read() on .png renders the image directly)
- Write generic evidence ("zone confirmed", "looks good", "valid zone") — describe the
  EXACT pattern at the level with EXACT prices, for EVERY verdict including REJECTED
- Only look at one side — verify BOTH supply AND demand rungs

EXAMPLE OUTPUT (DXY scaffold, spot 100.95):
ZONE|CONFIRMED|SUPPLY|101.14|101.19|4H|MoM|85|3 consecutive upper wicks rejecting from 101.190, 1x retest visible 07-08
ZONE|REJECTED|DEMAND|100.72|100.76|1H|MoM|65|two closes through 100.740 with no wick rejection — level not defended
ZONE|WEAK|LIQUIDITY|100.97|100.98|1H|MoM|55|rung recorded 2 reactions but wick evidence at 100.975 is thin — single sweep only`;
}
