# PLUTUS WORKFLOW

## The 5-Phase Pipeline

### Phase 1: DATA HARVESTING
Run plutus-generate-report with a weekStart to trigger automatic harvesting:
- Yahoo Finance: Prior week + target week OHLC
- Investinglive: VLM-extracted OTC option expiries
- Economic Calendar: Red folder events
- Barchart: MA cheat sheet levels
- TradingView Technicals: EMA/SMA
- ForexResearch: Analyst consensus
- FRED: RRP balance + trend
- Treasury: Auction schedule
- EIA: Petroleum status
- Fed H10: DXY components
- WebSearch: Institutional commentary
- MarketData: Live spot prices

### Phase 2: TTE ALGORITHM
Engine 1: 9-Pillar IP Zone Maps (per pair, AU→GU→EU→DXY)
Engine 2: Macro Shape Chain (day-by-day predictions)
Engine 3: Full-Spectrum Trade Setups (HTF swings, scalps, reinforcements, transitions)

### Phase 3: REPORT GENERATION
Produces TTE v5.3.3 .md report with:
- OTC options table (day by day)
- OHLC tables (prior week + target week)
- Economic calendar with red folder locks
- IP zone maps per pair
- Shape chains per pair
- Trade setup tables (HTF, scalp, reinforcement, transition)
- Cross-pair matrix
- Weekly execution calendar
- Session notes
- Zone path maps
- Data provenance audit

### Phase 4: CHART SETUP
Using visual-cortex tools EXCLUSIVELY:
1. Open each pair's chart in priority order (AU→GU→EU→DXY)
2. Set 4H timeframe for swing analysis
3. Draw all zones (green=demand, red=supply)
4. Draw all setups (entry/SL/TP horizontal lines)
5. Draw Fibonacci levels for reinforcement zones
6. Screenshot each chart for VLM verification

### Phase 5: REPLAY EXECUTION
Day by day, session by session:
1. Enter replay mode at the day's first candle
2. Step through candles one at a time
3. Monitor zone reactions
4. Fill orders when price hits entry levels
5. Adjust based on semantic intelligence
6. Close all at NY market close
