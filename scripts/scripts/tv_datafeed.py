#!/usr/bin/env python3
"""
TradingView OHLC via tvDatafeed library.
Connects to TradingView's WebSocket chart-data feed.
Returns real OHLC bars as JSON.

Usage:
    python3 tv_datafeed.py --symbol EURUSD --exchange FX --interval 4_hour --bars 500
    python3 tv_datafeed.py --symbol DXY --exchange TVC --interval daily --bars 180
    python3 tv_datafeed.py --symbol EURUSD --exchange FX --mode technicals
"""

import sys
import json
import argparse
import time


def fetch_ohlc(symbol, exchange, interval_str, n_bars):
    """Fetch OHLC bars via tvDatafeed WebSocket."""
    from tvDatafeed import TvDatafeed, Interval

    interval_map = {
        '1_hour': Interval.in_1_hour,
        '4_hour': Interval.in_4_hour,
        'daily': Interval.in_daily,
        '15_minute': Interval.in_15_minute,
        '30_minute': Interval.in_30_minute,
        '5_minute': Interval.in_5_minute,
    }

    tv_interval = interval_map.get(interval_str, Interval.in_4_hour)
    tv = TvDatafeed()

    df = tv.get_hist(symbol=symbol, exchange=exchange, interval=tv_interval, n_bars=n_bars)

    if df is None or df.empty:
        print(json.dumps([]))
        return

    bars = []
    for idx, row in df.iterrows():
        ts = int(idx.timestamp() * 1000) if hasattr(idx, 'timestamp') else 0
        bars.append({
            'timestamp': ts,
            'open': float(row['open']),
            'high': float(row['high']),
            'low': float(row['low']),
            'close': float(row['close']),
            'volume': float(row.get('volume', 0)) if row.get('volume') is not None else 0,
        })

    print(json.dumps(bars))


def fetch_technicals(symbol, exchange, interval_str):
    """Fetch current technicals via tradingview_ta."""
    from tradingview_ta import TA_Handler

    screener = "forex" if exchange == "FX" else "america"
    ta_interval = interval_str.replace('_hour', 'h').replace('_minute', '').replace('daily', '1d')
    if not ta_interval:
        ta_interval = '4h'

    h = TA_Handler(symbol=symbol, screener=screener, exchange=exchange, interval=ta_interval)
    a = h.get_analysis()
    i = a.indicators

    print(json.dumps({
        "close": i.get("close"),
        "open": i.get("open"),
        "high": i.get("high"),
        "low": i.get("low"),
        "ema20": i.get("EMA20"),
        "ema50": i.get("EMA50"),
        "ema100": i.get("EMA100"),
        "ema200": i.get("EMA200"),
        "sma20": i.get("SMA20"),
        "sma50": i.get("SMA50"),
        "sma100": i.get("SMA100"),
        "sma200": i.get("SMA200"),
        "rsi": i.get("RSI"),
        "recommendation": a.summary.get("RECOMMENDATION"),
        "buy": a.summary.get("BUY"),
        "sell": a.summary.get("SELL"),
        "neutral": a.summary.get("NEUTRAL"),
    }))


def main():
    parser = argparse.ArgumentParser(description='Fetch data from TradingView')
    parser.add_argument('--symbol', required=True)
    parser.add_argument('--exchange', required=True)
    parser.add_argument('--interval', default='4_hour',
                        choices=['1_hour', '4_hour', 'daily', '15_minute', '30_minute', '5_minute'])
    parser.add_argument('--bars', type=int, default=500)
    parser.add_argument('--mode', default='ohlc', choices=['ohlc', 'technicals'])

    args = parser.parse_args()

    if args.mode == 'technicals':
        fetch_technicals(args.symbol, args.exchange, args.interval)
    else:
        fetch_ohlc(args.symbol, args.exchange, args.interval, args.bars)


if __name__ == '__main__':
    main()
