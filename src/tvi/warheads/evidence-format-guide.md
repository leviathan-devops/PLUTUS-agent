# EVIDENCE FORMAT GUIDE

## The ZONE| Line Format (exact — one per line)
ZONE|type|top|bottom|timeframe|classification|confidence|evidence

- type: SUPPLY | DEMAND | LIQUIDITY
- top / bottom: exact prices from the chart's price axis (top > bottom)
- timeframe: 4H (or 1H for liquidity detail)
- classification: BoM | MoM | UNMITIGATED
- confidence: 0-100 (how clearly you can see this zone)
- evidence: the specific candlestick pattern WITH exact prices

## Harness Rules (deterministic — violations are REJECTED)
- >= 7 pipe-separated fields, or the line is skipped.
- Evidence >= 20 characters.
- Evidence must contain a price reference with 3+ decimals (e.g. 1.1480, 101.150).
- Evidence must NOT be a generic string: "zone confirmed", "looks good",
  "valid zone", "order block" (bare), "confirmed zone", "validated" — BLOCKED.

## GOOD Evidence (pattern + exact prices + context)
- "bearish engulfing at 101.150 with 3 upper wicks rejecting from 101.190"
- "bearish order block at 101.235 with strong body covering 70% of range,
  break of structure below 101.190"
- "bullish engulfing at 100.945 with double-bottom wick rejection from 100.845"
- "liquidity sweep at 100.975 with long lower wick through 100.945 then sharp
  reversal up 25 pips in 2 bars"

## BAD Evidence (all REJECTED)
- "zone confirmed" — no pattern, no price
- "looks good" — theater, not observation
- "valid zone" — circular
- "order block" — pattern named but no price, no specifics
- "strong supply here" — no measurable content

## The Test
Read your evidence back: could another trader find the EXACT candles on the
chart from your sentence alone? If yes — good. If it could describe any zone
on any chart — it is generic and will be rejected.

## Full Example (DXY at spot 100.95)
ZONE|SUPPLY|101.14|101.19|4H|MoM|85|bearish engulfing at 101.150 with 3 consecutive upper wicks rejecting from 101.190 supply zone
ZONE|DEMAND|100.84|100.95|4H|MoM|80|bullish engulfing at 100.945 with double-bottom wick rejection from 100.845 demand
ZONE|LIQUIDITY|100.97|100.98|4H|MoM|85|liquidity sweep at 100.975 with long lower wick through 100.945 then sharp reversal up 25 pips in 2 bars
