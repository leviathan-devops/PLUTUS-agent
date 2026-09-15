#!/usr/bin/env python3
"""Direct tvDatafeed OHLC fetcher for PLUTUS 4.0 pipeline.
Outputs JSON array: [{pair, timeframe, bars: [{timestamp, open, high, low, close, volume}]}]
"""
import json, sys, time
from tvDatafeed import TvDatafeed, Interval

PAIRS = [
    ("DXY", "TVC", "DXY"),
    ("EUR/USD", "FX", "EURUSD"),
    ("GBP/USD", "FX", "GBPUSD"),
    ("AUD/USD", "FX", "AUDUSD"),
]

TF_MAP = {
    "4H": Interval.in_4_hour,
    "1H": Interval.in_1_hour,
    "30m": Interval.in_30_minute,
    "15m": Interval.in_15_minute,
}

N_BARS = {"4H": 500, "1H": 500, "30m": 300, "15m": 300}

def main():
    tv = TvDatafeed()
    results = []
    for pair_name, exchange, symbol in PAIRS:
        for tf_str, tf_interval in TF_MAP.items():
            try:
                df = tv.get_hist(symbol=symbol, exchange=exchange, interval=tf_interval, n_bars=N_BARS[tf_str])
                if df is None or len(df) == 0:
                    results.append({"pair": pair_name, "timeframe": tf_str, "bars": [], "error": "empty"})
                    continue
                bars = []
                for ts, row in df.iterrows():
                    bars.append({
                        "timestamp": int(ts.timestamp() * 1000),
                        "open": float(row["open"]),
                        "high": float(row["high"]),
                        "low": float(row["low"]),
                        "close": float(row["close"]),
                        "volume": float(row.get("volume", 0)),
                    })
                results.append({"pair": pair_name, "timeframe": tf_str, "bars": bars, "error": None})
            except Exception as e:
                results.append({"pair": pair_name, "timeframe": tf_str, "bars": [], "error": str(e)})
    print(json.dumps(results))

if __name__ == "__main__":
    main()
