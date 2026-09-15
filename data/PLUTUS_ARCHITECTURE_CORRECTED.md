# PLUTUS ARCHITECTURE — CORRECT 3-ENGINE DESIGN

**Date**: 2026-07-18
**Status**: CORRECTED — visual setup generator is MANDATORY, not optional

---

## THE CORRECT ARCHITECTURE

```
Engine 1 (1D): IP Pressure Zones + 4H S/D Zones + LQZ Detection
  → WHERE is institutional liquidity? (battlefield map)
  → DATA-DRIVEN: 9-pillar analysis, ZFP, OTC options, pressure degrees
  → 4H S/D zones: singular origin candle (BoM/MoM classification)
  → LQZ zones: candlestick pattern detection (tight consolidations, wick clusters, body edges, reaction points)
  → Output: ZoneMapSnapshot with IP zones + S/D zones + LQZ zones

Engine 2 (2D): Macro Shape Chain
  → WHAT path will price take? (war timeline)
  → DATA-DRIVEN: ZFP-conditioned chain, day decomposition, shape prediction
  → Output: ShapePredictionSnapshot with 5-day shape chain, day-by-day breakdown

Engine 3 (3D): Visual Trade Setup Intelligence (MANDATORY — NOT OPTIONAL)
  → WHERE EXACTLY do we enter/exit? (sniper entries, SL, TP)
  → VISUAL-DRIVEN: candlestick pattern analysis, S/D/L zone identification, sniper entries
  → Input: Engine 1 zones + Engine 2 shapes + TradingView chart screenshots
  → Output: TradeSetup[] with entry, SL, TP, session, confidence
  → MUST BE VISION-BASED. MUST NOT fall back to data-based constructBasicSetups.
```

## THE CRITICAL RULE

**The visual setup generator is MANDATORY. If it fails, the tool MUST OPENLY FAIL and return the error.**

Currently, the pipeline has a fallback: when `visual-setup-generator` produces 0 setups, it falls back to `constructBasicSetups` (data-based approach). This is WRONG.

The correct behavior:
1. Call `visual-setup-generator.generateSetups()` for ALL 4 pairs
2. If it returns 0 setups for a pair, LOG THE ERROR and return an EMPTY result for that pair
3. Do NOT fall back to `constructBasicSetups`
4. The report should show "0 setups for [pair] — visual setup generator failed" with the error reason

## WHAT constructBasicSetups IS

`constructBasicSetups` is a DATA-BASED setup generation approach. It uses:
- Path-based setup generation (zone path from spot to target)
- Category-based setup generation (HTF Swing, Breakout Surge, etc.)
- Data-driven SL/TP computation

This is the OLD approach. It should be REPLACED with the visual setup generator. However, it can be kept as a CONFLUENCE LAYER — a data-driven check that validates the visual setups.

## THE VISUAL SETUP GENERATOR

`visual-setup-generator.ts` is the CORRECT setup generation approach. It uses:
- TradingView chart screenshots
- VLM (Vision-Language Model) analysis of candlestick patterns
- S/D/L zone identification from visual analysis
- Sniper entries at zone edges
- SL at next structural zone + buffer
- TP at nearest opposing zone with liquidity overlap

This is the CORRECT approach. It MUST be the primary setup generator.

## THE FIX

1. **Remove the fallback to constructBasicSetups** — if visual-setup-generator produces 0 setups, return 0 setups with an error message, NOT fallback to constructBasicSetups
2. **Add LQZ detection to Engine 1** — detect liquidity zones from 1H candlestick patterns
3. **Fix setup categories** — generate SS/BS/RWL/Whiplash categories (not just HTF Swing)
4. **Fix GBP/AUD 0-setup issue** — ensure visual-setup-generator produces setups for all 4 pairs
5. **Unify RRR constants** — generator and firewall use same values

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

---

## THE LQZ DETECTION

LQZ (Liquidity Zone) detection is part of Engine 1's zone map. It detects liquidity zones from 1H candlestick patterns:

1. **TIGHT CONSOLIDATION**: 3+ bars where (high-low) ≤ 5 pips
2. **WICK CLUSTER**: 3+ bars whose upper or lower wick tips align within 2 pips
3. **BODY EDGE**: 3+ bars whose open or close stops within 1 pip of same level
4. **REACTION POINT**: level touched ≥2 times followed by ≥30 pip rejection

These are VISUAL patterns that require candlestick analysis, not 9-pillar data analysis.

The LQZ zones are merged with IP zones to form the complete zone map. The visual setup generator then uses this zone map to generate setups.

---

## THE SETUP CATEGORIES

The visual setup generator should generate setups based on Engine 2's shape chain:

| Engine 2 Shape | Setup Category | Session |
|---|---|---|
| SS (Swing Scalps) | SWING_SCALP | London |
| BS (Breakout Surge) | HTF_SWING + BREAKOUT_SURGE | NY |
| WL (Whiplash) | HTF_SWING | NY |
| RWL (Reverse Whiplash) | HTF_SWING + BREAKOUT_SURGE | NY |
| R (Recovery) | REINFORCEMENT + SWING_SCALP | Both |
| SS_DWL (Double Whiplash) | SWING_SCALP + WHIPLASH | London |
| WLS (Whiplash Storm) | SWING_SCALP + HTF_SWING | London |

AUD/USD restriction: only HTF_SWING + BREAKOUT_SURGE (per pair-specific rules).

---

## THE RRR UNIFICATION

The generator and firewall MUST use the same RRR constants. Currently:
- Generator MIN_RRR: HTF Swing = 2.0
- Firewall RRR-1: HTF Swing = 2.5

This causes setups to pass the generator but get rejected by the firewall.

Fix: Single source of truth. Both use `rrrForCategory(category)` from `trading-constants.ts`.

---

## THE GBP/AUD FIX

The visual-setup-generator currently produces 0 raw setups for GBP/USD and AUD/USD. The root cause is:
1. The visual-setup-generator may not be called for these pairs
2. The visual-setup-generator produces 0 setups and falls back to constructBasicSetups
3. The fallback also produces 0 due to SHAPE_MAX_DISTANCE or AUD category gate

The fix:
1. Ensure visual-setup-generator is called for ALL 4 pairs
2. If it produces 0 for a pair, LOG THE ERROR and return 0 (NOT fallback)
3. Fix the visual-setup-generator to produce setups for GBP/AUD

---

## THE ERROR REPORTING

When the visual setup generator fails for a pair, the pipeline MUST report:
- Which pair failed
- Why it failed (error message)
- What the error was (exception details)

The report should NOT silently fall back to constructBasicSetups. It MUST openly fail so we can debug and fix the visual setup generator.
