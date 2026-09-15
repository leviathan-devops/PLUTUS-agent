#!/usr/bin/env python3
"""
Kronos HTTP Server — Port 7090
Loads Kronos-Base model and serves OHLCV forecasts via HTTP.

Endpoints:
  GET  /health          — liveness check
  POST /forecast        — generate forecast with sample paths + shape + percentiles
  POST /validate_setup  — P(entry trigger), P(SL sweep), P(TP reach)
  POST /zone_crossing   — day-by-day crossing probabilities

Called by Plutus pipeline Step 7.6 via fetch('http://localhost:7090/...')
"""

import os
import sys
import json
import time
import traceback
import math
from http.server import HTTPServer, BaseHTTPRequestHandler
from collections import Counter

import numpy as np

# --- Model loading with graceful degradation ---
MODEL_LOADED = False
LOAD_ERROR = ""
predictor = None
BACKEND = "cpu"

try:
    import torch
    BACKEND = "gpu" if torch.cuda.is_available() else "cpu"
except Exception:
    pass

try:
    from kronos.model import KronosModel
    print(f"[Kronos] Loading Kronos-Base on {BACKEND}...", file=sys.stderr)
    predictor = KronosModel.from_pretrained("NeoQuasar/Kronos-base", device=BACKEND)
    print("[Kronos] Ready.", file=sys.stderr)
    MODEL_LOADED = True
except Exception as e:
    LOAD_ERROR = f"{type(e).__name__}: {e}"
    print(f"[Kronos] FAILED: {LOAD_ERROR}", file=sys.stderr)
    traceback.print_exc()
    MODEL_LOADED = False


# --- Shape taxonomy ---
SHAPE_TAXONOMY = ["SS", "BS", "WL", "RWL", "RS", "PBS", "PWL", "PRWL", "R", "WLS"]


def classify_path_shape(path_closes, context_closes):
    """Classify a single sample path into a shape label."""
    n = len(path_closes)
    if n < 2:
        return "SS"

    last_close = float(context_closes[-1])
    fwd = float(path_closes[-1])
    pct_change = (fwd - last_close) / last_close if last_close != 0 else 0

    x = np.arange(n, dtype=np.float64)
    if n > 1:
        coef = np.polyfit(x, path_closes, 1)
        slope = float(coef[0])
    else:
        slope = 0.0

    scale = abs(last_close) + 1e-12
    rel_slope = slope / scale * 100.0

    spread = float(np.max(path_closes) - np.min(path_closes)) / scale

    # Check for reversal (slope changes sign)
    half = max(1, n // 2)
    if half > 1 and (n - half) > 1:
        s1r = float(np.polyfit(x[:half], path_closes[:half], 1)[0]) / scale * 100.0
        s2r = float(np.polyfit(x[half:], path_closes[half:], 1)[0]) / scale * 100.0
    else:
        s1r = s2r = 0.0

    reversal = (s1r * s2r < 0) and (abs(s1r) > 0.02) and (abs(s2r) > 0.02)

    # Consolidation check
    ctx_range = float(np.max(context_closes) - np.min(context_closes))
    path_range = float(np.max(path_closes) - np.min(path_closes))
    consol = path_range < 0.5 * ctx_range if ctx_range > 0 else False

    if reversal and abs(s1r) > 0.03:
        if s1r > 0:
            return "RWL"
        else:
            return "RS"
    elif consol and abs(rel_slope) < 0.01:
        return "SS"
    elif rel_slope > 0.02:
        if pct_change > 0.005:
            return "BS"
        else:
            return "PBS"
    elif rel_slope < -0.02:
        return "RS"
    elif abs(rel_slope) < 0.01 and not consol:
        return "WL"
    else:
        return "SS"


class Handler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {
                "status": "ok" if MODEL_LOADED else "unavailable",
                "backend": BACKEND,
                "model": "NeoQuasar/Kronos-base" if MODEL_LOADED else "",
                "version": "1.0.0",
                "error": LOAD_ERROR,
            })
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if not MODEL_LOADED:
            self._json(503, {"error": f"model not loaded: {LOAD_ERROR}"})
            return
        try:
            body = json.loads(
                self.rfile.read(int(self.headers.get("Content-Length", 0)))
            )
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
        import pandas as pd

        pair = body.get("pair", "")
        timeframe = body.get("timeframe", "1H")
        horizon = int(body.get("horizon_bars", 24))
        n_samples = int(body.get("sample_count", 5))
        ohlc = body.get("ohlc", [])

        if not ohlc or len(ohlc) < 30:
            self._json(400, {"error": f"need at least 30 OHLCV bars, got {len(ohlc)}"})
            return

        df = pd.DataFrame(ohlc, columns=["timestamp", "open", "high", "low", "close", "volume"])
        if "timestamp" in df.columns:
            df = df.drop(columns=["timestamp"])
        df = df[["open", "high", "low", "close", "volume"]]

        if len(df) > 512:
            df = df.iloc[-512:]

        context_closes = df["close"].values.astype(np.float64)

        ts = pd.Series(range(len(df)))
        y_ts = pd.Series(range(len(df), len(df) + horizon))

        samples = []
        for _ in range(n_samples):
            try:
                pred = predictor.predict(
                    df=df, x_timestamp=ts, y_timestamp=y_ts,
                    pred_len=horizon, T=0.8, top_p=0.85,
                    sample_count=1, verbose=False,
                )
                samples.append(pred["close"].values.astype(np.float64))
            except Exception as e:
                print(f"[Kronos] sample failed: {e}", file=sys.stderr)
                continue

        if not samples:
            self._json(500, {"error": "all samples failed"})
            return

        shape_labels = [classify_path_shape(s, context_closes) for s in samples]
        counts = Counter(shape_labels)
        shape, cnt = counts.most_common(1)[0]
        shape_conf = cnt / len(samples)
        shape_dist = {s: counts.get(s, 0) / len(samples) for s in SHAPE_TAXONOMY}

        closes = np.array(samples)
        p10 = np.percentile(closes, 10, axis=0).tolist()
        p25 = np.percentile(closes, 25, axis=0).tolist()
        p50 = np.percentile(closes, 50, axis=0).tolist()
        p75 = np.percentile(closes, 75, axis=0).tolist()
        p90 = np.percentile(closes, 90, axis=0).tolist()

        ctx_range = float(df["high"].max() - df["low"].min())
        path_ranges = closes.max(axis=1) - closes.min(axis=1)
        consol = float(np.mean(path_ranges < 0.5 * ctx_range))

        last_close = float(df["close"].iloc[-1])
        trend = float(np.mean(closes[:, -1] > last_close))

        self._json(200, {
            "instrument": pair,
            "timeframe": timeframe,
            "horizon_bars": horizon,
            "sample_count": len(samples),
            "shape_classification": shape,
            "shape_confidence": shape_conf,
            "shape_distribution": shape_dist,
            "consolidation_probability": consol,
            "trend_direction_probability": trend,
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
    print(f"[Kronos] Server listening on :{port}", file=sys.stderr)
    server.serve_forever()
