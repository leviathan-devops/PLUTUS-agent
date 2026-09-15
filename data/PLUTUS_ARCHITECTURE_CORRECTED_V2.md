# PLUTUS ARCHITECTURE — CORRECTED ZONE IDENTIFICATION

**Date**: 2026-07-18
**Status**: CORRECTED — zone identification from candlestick patterns, not IP zones

---

## ZONE COLORS (CORRECT)

| Zone Type | Color | Description |
|---|---|---|
| **Demand Zone** | **BLUE** | Order block candle that precedes a strong bullish breakout |
| **Supply Zone** | **RED** | Order block candle that precedes a strong bearish breakout |
| **Liquidity Zone (LQZ)** | **GREEN** | Candle body edge to end of wick on liquidity sweep candles |

**CRITICAL**: I previously had demand/green and liquidity/blue swapped. The correct colors are:
- Demand = BLUE
- Supply = RED
- Liquidity = GREEN

---

## ZONE IDENTIFICATION PATTERNS (FROM USER'S SCREENSHOTS)

### S/D Zones (BLUE for demand, RED for supply)

**Pattern**: ONE single order block candle that precedes a strong breakout candle.

**How to identify**:
1. Find a STRONG BREAKOUT candle (large body, strong directional move)
2. Look at the candle IMMEDIATELY BEFORE the breakout
3. That candle is the ORDER BLOCK
4. The S/D zone is drawn from the order block candle's range

**Examples from screenshots**:
- "1H (Unmitigated) | BoM" — 1H Beginning of Move demand zone at ~1.33400-1.33500 (BLUE)
- "1H (Unmitigated) | MoM" — 1H Middle of Move demand zone at ~1.33600-1.33700 (BLUE)
- "1H (1x - Softly Mitigated) | BoM" — 1H Beginning of Move supply zone at ~1.34357-1.34500 (RED)
- "4H (Unmitigated) | BoM" — 4H Beginning of Move demand zone at ~1.33800-1.34200 (BLUE)
- "1H Refined 4H (Unmitigated) | BoM" — 1H refined 4H demand zone at ~1.33955-1.34155 (BLUE)

### LQ Zones (GREEN)

**Pattern**: Candle body edge to end of wick on liquidity sweep candle patterns, drawn over multiple successive liquidity sweep candles overlapping the same area.

**How to identify**:
1. Find candles with LONG WICKS (liquidity sweeps)
2. The wick represents the liquidity sweep (price spiking to grab liquidity then reversing)
3. The LQ zone is drawn from the candle body edge to the end of the wick
4. When multiple liquidity sweep candles overlap the same area, they form a liquidity zone

**Examples from screenshots**:
- Green rectangles at ~1.34000-1.34200 on 30m timeframe
- Green rectangles at ~1.35000-1.35200 on 15m timeframe
- Green rectangles at ~1.34850-1.34950 on 15m timeframe

---

## ENGINE 3 ARCHITECTURE (CORRECTED)

```
Engine 1 (1D): IP Pressure Zones + 4H S/D Zones + LQZ Detection
  → WHERE is institutional liquidity? (battlefield map)
  → DATA-DRIVEN: 9-pillar analysis, ZFP, OTC options, pressure degrees
  → 4H S/D zones: singular origin candle (BoM/MoM classification)
  → LQZ zones: candlestick pattern detection (liquidity sweep candles)
  → Output: ZoneMapSnapshot with IP zones + S/D zones + LQZ zones

Engine 2 (2D): Macro Shape Chain
  → WHAT path will price take? (war timeline)
  → DATA-DRIVEN: ZFP-conditioned chain, day decomposition, shape prediction
  → Output: ShapePredictionSnapshot with 5-day shape chain, day-by-day breakdown

Engine 3 (3D): Visual Trade Setup Intelligence (MANDATORY — NOT OPTIONAL)
  → WHERE EXACTLY do we enter/exit? (sniper entries, SL, TP)
  → VISUAL-DRIVEN: candlestick pattern analysis, S/D/L zone identification, sniper entries
  → Input: TradingView chart screenshots + VLM analysis
  → Output: TradeSetup[] with entry, SL, TP, session, confidence
  → MUST BE VISION-BASED. MUST NOT use Engine 1 IP zones as input.
```

## THE CRITICAL RULE

**Engine 3 produces zones FROM CANDLESTICKS, NOT from Engine 1 IP zones.**

The visual-zone-lobe should:
1. Take TradingView chart screenshots
2. Analyze candlestick patterns using VLM
3. Identify S/D zones (order block candles) from the chart
4. Identify LQ zones (liquidity sweep candles) from the chart
5. Map trade setups from these zones

Then Engine 1 + 2 data is fed into the trade setup engine to:
- Calculate confidence (high vs low)
- Map TP targets
- Validate direction

**Engine 3 is ISOLATED from Engine 1 and 2.** It works independently. Engine 1 + 2 are SUPERIMPOSED ON TOP after Engine 3 produces its zones and setups.

---

## THE FIX

The visual-zone-lobe currently uses Engine 1 IP zones as input. This is WRONG.

The visual-zone-lobe should:
1. Take TradingView chart screenshots
2. Analyze candlestick patterns using VLM
3. Identify S/D zones (order block candles) from the chart
4. Identify LQ zones (liquidity sweep candles) from the chart
5. Map trade setups from these zones

Then Engine 1 + 2 data is fed into the trade setup engine to compute confidence and TP targets.

---

## THE ERROR HANDLING

If the visual setup generator fails:
```
{
  "status": "error",
  "error": "Visual setup generator failed for GBP/USD: [reason]",
  "pair": "GBP/USD",
  "setups": [],
  "report": "0 setups generated — visual setup generator failed"
}
```

NOT:
```
{
  "status": "partial",
  "setups": [fallback constructBasicSetups results],
  "report": "Report generated with fallback"
}
```

The pipeline MUST NOT silently fall back. It MUST openly fail so we can debug and fix the visual setup generator.
