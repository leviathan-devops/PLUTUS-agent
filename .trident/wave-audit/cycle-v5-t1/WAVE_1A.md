# WAVE 1a audit — temporal OHLC lock
- bars_raw sha256: bd09f2b88ccaffd66a1f034c1c05147703ab98cf8bf40fcd8ea1b37965cfeb5c (dual rebuild match)
- feeds=12 bars=4568 maxTimestamp=1783317600000 (=== ANALYSIS_POINT_MS)
- 30m/15m GAP documented; forged_ltf=false
- FutureBarLeak: shipped decodeMarketData 13 pass / 0 fail (adapter + leak + real-feed graft)
- jesl HELLO-GATE ALL GREEN (hygiene)
- frozen pair MATCH; plutus/main e99377f
