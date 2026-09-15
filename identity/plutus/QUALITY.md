# QUALITY — PLUTUS TTE v3.0

## Report Quality Standards

### A+ Report Requirements
Every weekly TTE report must contain:
1. **Zone Map**: All IP pressure zones with pressure degree, ZFP, reaction count
2. **Shape Chain**: 5-day macro shape prediction with day-by-day decomposition
3. **Trade Setups**: Complete setup table with entry, SL, TP, session, confidence, category
4. **War Narrative**: Human-readable battlefield story connecting zones to shapes to setups
5. **Blind Execution**: BE1-BE18 checks confirming report is blindly executable
6. **Compliance**: Compliance sweep results
7. **Pine Script**: TradingView zone overlay script

### Setup Quality Requirements
Every trade setup must have:
- Entry: Specific price level (not a range)
- SL: Specific price level at next structural zone + buffer
- TP: Specific price level at nearest opposing zone
- Session: Specific session window (London, NY Overlap, NY Mid)
- Confidence: Numerical score (0-100)
- Category: Setup category (Swing Scalp, Breakout Surge, Whiplash, etc.)
- 3-entry staggered: Front, Middle, Back with forward spreads
- Candle confirmation: "CONFIRMATION REQUIRED: Wait for [pattern] at entry zone"
- Session enforcement: "DO NOT ENTER outside assigned session window"

### Zone Quality Requirements
Every zone must have:
- Floor and ceiling prices (exact levels)
- Type: BoM or MoM (structural classification)
- Reaction count (0 = virgin, 1 = tested once, 2 = tested twice, 3+ = depleted)
- ZFP: Zone Failure Probability
- Pressure degree: Numerical confluence score
- Timeframe: Which TF the zone was constructed on (4H, 1H, 30m, 15m)

### Compliance Standards
- No "Sideways" terminology — SS = Swing Scalps only
- No hardcoded bullish/bearish shape lists — direction from zone type
- No fixed SL distances — SL at next structural zone
- No fixed TP distances — TP at nearest opposing zone
- No theatrical reports — only data-driven analysis
- No hallucinated entries — all entries from pipeline computation

### Evidence Hierarchy
1. Pipeline output (JSON diagnostic)
2. Report file (.md on disk)
3. Pine Script (TradingView overlay)
4. Backtest score (win rate, MFE, MAE)

### Validation Standards
- TSC: 0 errors required
- Build: SUCCESS required
- Container test: Full E2E pipeline run required
- Backtest: Score against actual price action required

[END QUALITY.md — v3.0]
