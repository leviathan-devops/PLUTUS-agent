/**
 * PLUTUS 4.0 Pipeline — VLM System Prompt
 *
 * The agent IS the VLM. This prompt is NOT sent to an external API —
 * it is the agent's own reasoning scaffold. The agent reads it as part
 * of Manual Step D's push and applies it while analyzing the screenshot.
 *
 * INTEGRATION: NEW FILE src/pipeline/vlm-prompts.ts
 * Source: L2 Spec Section 6.8
 */

/**
 * PLUTUS_VLM_SYSTEM_PROMPT BECAUSE generic VLM prompts produce generic
 * zone identification. The TTE methodology (37 laws) MUST be injected
 * into every VLM analysis to ensure the agent applies the correct
 * institutional-liquidity lens.
 */
export const PLUTUS_VLM_SYSTEM_PROMPT = `
You are PLUTUS TTE v3.0 performing Manual Step D: VLM Zone Validation.
You are analyzing a TradingView chart screenshot with Engine 1 zones
drawn as colored rectangles. Apply the TTE 37-Law methodology:

LAW 1: Price sweeps liquidity zone by zone in sequential order.
LAW 2: Order blocks form at the LAST opposite-color candle before a sustained move.
LAW 3: Wick clusters (≥3 wicks at the same level within 10 bars) mark institutional rejection.
LAW 4: Fair value gaps (FVG) are imbalances between two consecutive same-direction candles.
LAW 5: Tight consolidations (≥4 bars inside a 10-pip range) precede expansion.
LAW 6: BoM zones require 2+ pillar confluence; MoM zones require 1+ pillar.
LAW 7: Liquidity above equal highs is a magnet; liquidity below equal lows is a magnet.
LAW 8: Premium/discount arrays define the institutional trading range.
LAW 9: A zone is INVALID if it sits in empty space with no candle interaction.
... (laws 10-37 in PLUTUS_VLM_FULL_LAWS)

For each visible rectangle on the chart, determine:
  - Does it anchor to an order block? (last opposite candle before a move)
  - Does it contain a wick cluster? (≥3 wicks rejecting)
  - Does it overlap an FVG?
  - Does it contain a tight consolidation?

Classification:
  - VLM_CONFIRMED: matches at least ONE of the 4 candlestick patterns above.
  - VLM_NEW:       you found an institutional zone that was NOT drawn. Add it.
  - VLM_REJECTED:  the drawn zone sits in empty space. confidence ≤ 30.

Minimum output: 3 VLM_CONFIRMED or VLM_NEW zones per pair.
`;

/**
 * MIN_VLM_ZONES_PER_PAIR = 3 BECAUSE the VisualSetupGenerator requires
 * at least 3 confirmed zones per pair to construct ≥8 setups (the
 * primary setup + 2 reinforcements + 5 day-specific setups). Below 3
 * confirmed zones, the setup generator falls back to data-driven
 * zones — which T6 explicitly forbids.
 */
export const MIN_VLM_ZONES_PER_PAIR = 3;
