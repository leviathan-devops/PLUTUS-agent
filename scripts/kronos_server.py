#!/usr/bin/env python3
"""
Kronos HTTP Server — Port 7090
Uses Kronos-Base (Tsinghua/AAAI 2026) on GPU to generate OHLCV forecasts.

Key design decisions:
  1. GPU mode — RTX 4080 with 12GB VRAM, Kronos-Base uses ~1.2GB
  2. Direction-based shape classification — not range-based
     Kronos has mean-reversion bias, so path ranges are naturally tight.
     We classify based on endpoint direction votes, not path morphology.
  3. sample_count=1 per predict() call (Kronos AVERAGES internally at sample_count>1)

Endpoints:
  GET  /health          — liveness check
  POST /forecast        — sample paths + direction + percentiles
  POST /validate_setup  — P(entry), P(SL sweep), P(TP reach)
  POST /zone_crossing   — day-by-day crossing probabilities
"""

import os
import sys

sys.path.insert(0, "/home/leviathan/kronos")

import json
import time
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from collections import Counter

import numpy as np
import pandas as pd
import torch

# --- Model loading ---
MODEL_LOADED = False
LOAD_ERROR = ""
predictor = None
BACKEND = "gpu" if torch.cuda.is_available() else "cpu"
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

try:
    from model import Kronos, KronosTokenizer, KronosPredictor
    print(f"[Kronos] Loading on {DEVICE} (CUDA: {torch.cuda.is_available()})...", file=sys.stderr)
    tokenizer = KronosTokenizer.from_pretrained("NeoQuasar/Kronos-Tokenizer-base")
    model = Kronos.from_pretrained("NeoQuasar/Kronos-base")
    predictor = KronosPredictor(model, tokenizer, device=DEVICE, max_context=512)
    print(f"[Kronos] Ready on {BACKEND}.", file=sys.stderr)
    MODEL_LOADED = True
except Exception as e:
    LOAD_ERROR = f"{type(e).__name__}: {e}"
    print(f"[Kronos] FAILED: {LOAD_ERROR}", file=sys.stderr)
    traceback.print_exc()
    MODEL_LOADED = False


SHAPE_TAXONOMY = ["SS", "BS", "WL", "RWL", "RS", "PBS", "PWL", "PRWL", "R", "WLS"]


def classify_path_direction(path_closes, last_close):
    """
    Classify a sample path based on ENDPOINT DIRECTION, not range.
    
    Kronos has structural mean-reversion bias — paths stay tight.
    But the endpoint direction IS meaningful:
      - If endpoint > last_close → bullish (BS/PBS/WL)
      - If endpoint < last_close → bearish (RS/RWL)
      - If endpoint ≈ last_close → consolidation (SS)
    
    Magnitude of the move determines strength:
      - Large move (> 0.1% for FX) → strong (BS/RS)
      - Moderate move (0.03-0.1%) → moderate (PBS/WL/RWL)  
      - Small move (< 0.03%) → SS
    """
    fwd = float(path_closes[-1])
    pct = (fwd - last_close) / last_close if last_close != 0 else 0
    abs_pct = abs(pct)

    # Check for reversal: first half goes one way, second half reverses
    n = len(path_closes)
    half = max(1, n // 2)
    if half > 1 and (n - half) > 1:
        x1 = np.arange(half, dtype=np.float64)
        x2 = np.arange(n - half, dtype=np.float64) + half
        s1 = float(np.polyfit(x1, path_closes[:half], 1)[0])
        s2 = float(np.polyfit(x2, path_closes[half:], 1)[0])
    else:
        s1 = s2 = 0.0

    reversal = (s1 * s2 < 0) and abs(s1) > 1e-6 and abs(s2) > 1e-6

    if reversal:
        if s1 > 0:
            return "RWL"  # up then down
        else:
            return "RS"   # down then up (reversal sell-off)
    
    if abs_pct < 0.0003:  # < 0.03% = < 3 pips for EUR/USD
        return "SS"
    elif pct > 0.001:     # > 0.1% = strong bullish
        return "BS"
    elif pct > 0.0003:    # moderate bullish
        return "PBS"
    elif pct < -0.001:    # > 0.1% bearish
        return "RS"
    elif pct < -0.0003:   # moderate bearish
        return "RWL"
    else:
        return "SS"


class Handler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {
                "status": "ok" if MODEL_LOADED else "unavailable",
                "backend": BACKEND,
                "model": "NeoQuasar/Kronos-base" if MODEL_LOADED else "",
                "device": DEVICE,
                "version": "2.0.0",
                "error": LOAD_ERROR,
            })
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if not MODEL_LOADED:
            self._json(503, {"error": f"model not loaded: {LOAD_ERROR}"})
            return
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            if self.path == "/forecast":
                self._handle_forecast(body)
            elif self.path == "/validate_setup":
                self._handle_validate(body)
            elif self.path == "/zone_crossing":
                self._handle_crossing(body)
            else:
                self._json(404, {"error": f"unknown endpoint: {self.path}"})
        except Exception as e:
            traceback.print_exc()
            self._json(500, {"error": str(e)})

    def _handle_forecast(self, body):
        pair = body.get("pair", "")
        timeframe = body.get("timeframe", "1H")
        horizon = int(body.get("horizon_bars", 24))
        n_samples = int(body.get("sample_count", 5))
        ohlc = body.get("ohlc", [])

        if not ohlc or len(ohlc) < 30:
            self._json(400, {"error": f"need at least 30 OHLCV bars, got {len(ohlc)}"})
            return

        df = pd.DataFrame(ohlc, columns=["ts", "open", "high", "low", "close", "volume"])

        # Timestamps — refuse wall-clock fallback (AP-5 / no Date.now in decisions).
        if df["ts"].iloc[-1] == 0 or df["ts"].isna().all():
            self._json(400, {"error": "ohlc timestamps required; wall-clock fallback refused"})
            return
        x_ts = pd.Series(pd.to_datetime(df["ts"], unit="ms", errors="coerce"))
        if x_ts.isna().all():
            self._json(400, {"error": "ohlc timestamps unparseable; wall-clock fallback refused"})
            return

        input_df = df[["open", "high", "low", "close", "volume"]].copy()
        input_df.index = x_ts

        if len(input_df) > 512:
            input_df = input_df.iloc[-512:]
            x_ts = x_ts.iloc[-512:]

        context_closes = input_df["close"].values.astype(np.float64)
        last_close = float(context_closes[-1])

        y_ts = pd.Series(pd.date_range(
            start=x_ts.iloc[-1] + pd.Timedelta(hours=1),
            periods=horizon, freq="1h"
        ))

        # Generate N independent sample paths
        samples = []
        for i in range(n_samples):
            try:
                pred_df = predictor.predict(
                    df=input_df, x_timestamp=x_ts, y_timestamp=y_ts,
                    pred_len=horizon, T=0.8, top_p=0.85, sample_count=1, verbose=False,
                )
                closes = pred_df["close"].values.astype(np.float64)
                samples.append(closes)
            except Exception as e:
                print(f"[Kronos] sample {i} failed: {e}", file=sys.stderr)
                continue

        if not samples:
            self._json(500, {"error": "all samples failed"})
            return

        # Direction-based shape classification
        shape_labels = [classify_path_direction(s, last_close) for s in samples]
        counts = Counter(shape_labels)
        shape, cnt = counts.most_common(1)[0]
        shape_conf = cnt / len(samples)
        shape_dist = {s: counts.get(s, 0) / len(samples) for s in SHAPE_TAXONOMY}

        closes_arr = np.array(samples)
        p10 = np.percentile(closes_arr, 10, axis=0).tolist()
        p25 = np.percentile(closes_arr, 25, axis=0).tolist()
        p50 = np.percentile(closes_arr, 50, axis=0).tolist()
        p75 = np.percentile(closes_arr, 75, axis=0).tolist()
        p90 = np.percentile(closes_arr, 90, axis=0).tolist()

        # Direction stats — THESE are the real signal
        endpoints = closes_arr[:, -1]
        votes_up = int(np.sum(endpoints > last_close))
        votes_down = int(np.sum(endpoints <= last_close))
        trend_direction_probability = votes_up / len(samples)

        # Consolidation: low directional conviction
        direction_margin = abs(votes_up - votes_down) / len(samples)
        consolidation_probability = 1.0 - direction_margin

        self._json(200, {
            "instrument": pair,
            "timeframe": timeframe,
            "horizon_bars": horizon,
            "sample_count": len(samples),
            "shape_classification": shape,
            "shape_confidence": shape_conf,
            "shape_distribution": shape_dist,
            "consolidation_probability": float(consolidation_probability),
            "trend_direction_probability": float(trend_direction_probability),
            "path_percentiles": {
                "p10": p10, "p25": p25, "p50": p50,
                "p75": p75, "p90": p90,
            },
            "last_close": last_close,
            "generated_at": int(time.time() * 1000),
        })

    def _handle_validate(self, body):
        pp = body.get("path_percentiles", {})
        entry = float(body["entry"])
        sl = float(body["sl"])
        tp = float(body["tp"])
        direction = body.get("direction", "LONG").upper()
        max_candles = int(body.get("max_candles", 24))

        paths = []
        for key in ["p10", "p25", "p50", "p75", "p90"]:
            if key in pp:
                paths.append(pp[key][:max_candles])
        if not paths:
            self._json(400, {"error": "no path_percentiles"})
            return

        paths = np.array(paths)
        n = paths.shape[0]

        if direction == "LONG":
            triggered = np.any(paths >= entry, axis=1)
        else:
            triggered = np.any(paths <= entry, axis=1)
        p_entry = float(np.mean(triggered))

        sl_count = 0
        for i in range(n):
            path = paths[i]
            if direction == "LONG":
                sl_hit = np.where(path <= sl)[0]
                tp_hit = np.where(path >= tp)[0]
            else:
                sl_hit = np.where(path >= sl)[0]
                tp_hit = np.where(path <= tp)[0]
            sl_first = sl_hit[0] if len(sl_hit) > 0 else float('inf')
            tp_first = tp_hit[0] if len(tp_hit) > 0 else float('inf')
            if sl_first < tp_first:
                sl_count += 1

        if direction == "LONG":
            reached = np.any(paths >= tp, axis=1)
        else:
            reached = np.any(paths <= tp, axis=1)

        self._json(200, {
            "entry_trigger_probability": p_entry,
            "sl_sweep_before_tp_probability": sl_count / n,
            "tp_reach_probability": float(np.mean(reached)),
        })

    def _handle_crossing(self, body):
        pp = body.get("path_percentiles", {})
        zone_price = float(body["zone_price"])
        last_close = float(body.get("last_close", 0))
        cpd = int(body.get("candles_per_day", 6))

        p50 = pp.get("p50", [])
        if not p50:
            self._json(400, {"error": "no p50"})
            return

        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        day_probs = {d: 0.0 for d in days}

        for key in ["p10", "p25", "p50", "p75", "p90"]:
            path = pp.get(key, [])
            if not path:
                continue
            if zone_price > last_close:
                crossings = np.where(np.array(path) >= zone_price)[0]
            else:
                crossings = np.where(np.array(path) <= zone_price)[0]
            if len(crossings) > 0:
                di = crossings[0] // cpd
                if di < len(days):
                    day_probs[days[di]] += 0.2

        self._json(200, {"zone_price": zone_price, "day_probabilities": day_probs})

    def _json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=float).encode())

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("KRONOS_PORT", "7090"))
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"[Kronos] Server listening on :{port} ({BACKEND})", file=sys.stderr)
    server.serve_forever()
