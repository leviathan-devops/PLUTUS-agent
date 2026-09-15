#!/usr/bin/env python3
"""
TimesFM HTTP Server — Loads google/timesfm-2.5-200m-pytorch on CPU and serves
forecasts via HTTP on port 8083. Called by the Plutus pipeline container
via socat bridge at port 18083.

VLM (Jan-v2-VL) occupies ~11GB VRAM. TimesFM 200M needs ~800MB at FP32.
Loading on CPU avoids VRAM contention. Forecast takes 1-3s per pair on CPU.
"""

import os
# GPU mode — VLM no longer running, 12GB VRAM available
# TimesFM 200M uses ~800MB, Kronos-Base uses ~1.2GB — both fit easily

import json, sys, traceback
from http.server import HTTPServer, BaseHTTPRequestHandler

import torch
print(f"[TimesFM] CUDA available: {torch.cuda.is_available()}", file=sys.stderr)

try:
    from timesfm import TimesFM_2p5_200M_torch, ForecastConfig
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[TimesFM] Loading model on {DEVICE}...", file=sys.stderr)
    model = TimesFM_2p5_200M_torch.from_pretrained("google/timesfm-2.5-200m-pytorch")
    if torch.cuda.is_available():
        model.model.to("cuda")
        print(f"[TimesFM] Inner model moved to CUDA: {torch.cuda.get_device_name(0)}", file=sys.stderr)
    print("[TimesFM] Compiling...", file=sys.stderr)
    cfg = ForecastConfig(
        max_context=1024,
        max_horizon=128,
        use_continuous_quantile_head=True,
        fix_quantile_crossing=True,
        force_flip_invariance=True,
        infer_is_positive=True,
        return_backcast=True,
    )
    model.compile(forecast_config=cfg)
    print(f"[TimesFM] Ready on {DEVICE}.", file=sys.stderr)
    BACKEND = DEVICE
except Exception as e:
    print(f"[TimesFM] FAILED: {e}", file=sys.stderr)
    traceback.print_exc()
    model = None
    BACKEND = "unavailable"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"status": "ok" if model else "unavailable", "backend": BACKEND, "model": "timesfm-2.5-200m"})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if not model:
            self._json(503, {"error": "model not loaded"})
            return
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            if self.path == "/forecast":
                self._handle_forecast(body)
            elif self.path == "/assess":
                self._handle_assess(body)
            elif self.path == "/reconcile_shape":
                self._handle_reconcile(body)
            else:
                self._json(404, {"error": "unknown endpoint"})
        except Exception as e:
            traceback.print_exc()
            self._json(500, {"error": str(e)})

    def _handle_forecast(self, body):
        closes = body.get("closes", [])
        horizon = body.get("horizon", 24)
        if len(closes) < 32:
            self._json(400, {"error": f"need at least 32 closes, got {len(closes)}"})
            return

        import numpy as np
        arr = np.array(closes, dtype=np.float32)

        # ── XReg (external regressors) support ──
        # USD-quote FX pairs can use DXY as an exogenous covariate to improve
        # forecast accuracy via TimesFM's continuous quantile head.
        xreg = None
        used_xreg = False
        pair = body.get("pair", "")
        dxy_context = body.get("dxy_context")
        USD_QUOTE_PAIRS = {"EUR/USD", "GBP/USD", "AUD/USD"}
        if pair in USD_QUOTE_PAIRS and dxy_context is not None and len(dxy_context) >= len(closes):
            dxy_arr = np.array(dxy_context, dtype=np.float32)
            # Pad to context + horizon if needed (hold last DXY value forward)
            needed = len(closes) + horizon
            if len(dxy_arr) < needed:
                pad = np.full(needed - len(dxy_arr), float(dxy_arr[-1]), dtype=np.float32)
                dxy_arr = np.concatenate([dxy_arr, pad])
            # xreg shape per series: (context_len + horizon, num_covariates)
            xreg = dxy_arr.reshape(-1, 1)
            used_xreg = True

        if xreg is not None:
            point, quantiles = model.forecast(horizon=horizon, inputs=[arr], xreg=[xreg])
        else:
            point, quantiles = model.forecast(horizon=horizon, inputs=[arr])
        # point: (1, horizon) ndarray, quantiles: (1, horizon, n_quantiles) ndarray
        point_flat = point.flatten() if hasattr(point, 'flatten') else np.array(point).flatten()
        quant_flat = quantiles.flatten() if hasattr(quantiles, 'flatten') else np.array(quantiles).flatten()

        # Shape classification
        last = closes[-1]
        fwd = float(point_flat[0]) if len(point_flat) > 0 else last
        pct_change = (fwd - last) / last if last != 0 else 0
        if abs(pct_change) < 0.002:
            shape = "SS"
        elif pct_change > 0.005:
            shape = "BS"
        elif pct_change < -0.005:
            shape = "R"
        else:
            shape = "WL"

        # Consolidation probability (high when variance is low)
        std = float(np.std(closes[-20:])) if len(closes) >= 20 else 0
        consolidation_prob = min(1.0, max(0.0, 1.0 - std / (last * 0.01)))

        self._json(200, {
            "instrument": body.get("pair", ""),
            "timeframe": body.get("timeframe", "4H"),
            "horizon_bars": horizon,
            "point_forecast": point_flat[:horizon].tolist(),
            "quantile_forecast": quant_flat[:horizon].tolist(),
            "shape_classification": shape,
            "shape_confidence": 0.7,
            "consolidation_probability": consolidation_prob,
            "trend_direction_probability": max(0.0, min(1.0, 0.5 + pct_change * 100)),
            "context_mean": float(np.mean(closes[-50:])) if len(closes) >= 50 else float(np.mean(closes)),
            "context_std": std,
            "last_close": float(last),
            "used_xreg_covariates": used_xreg,
            "generated_at": int(__import__('time').time() * 1000),
        })

    def _handle_assess(self, body):
        entry = body.get("entry", 0)
        sl = body.get("sl", 0)
        tp = body.get("tp", 0)
        direction = body.get("direction", "LONG")
        spread = body.get("spread", 0)
        pip_value = body.get("pip_value", 0.0001)

        import numpy as np
        quantiles = body.get("forecast_quantiles", [])
        if not quantiles:
            self._json(200, {"p_tp_reach": 0.5, "p_sl_hit": 0.5, "p_neither": 0.0,
                "expected_value_pips": 0, "tp_pips": abs(tp-entry)/pip_value,
                "sl_pips": abs(entry-sl)/pip_value, "forecast_horizon_bars": 24,
                "forecast_confidence": 0.5, "quality_grade": "C",
                "notes": "No quantile data — default probabilities"})
            return

        arr = np.array(quantiles)
        tp_pips = abs(tp - entry) / pip_value
        sl_pips = abs(entry - sl) / pip_value

        if direction == "LONG":
            p_tp = float(np.mean(arr >= tp))
            p_sl = float(np.mean(arr <= sl))
        else:
            p_tp = float(np.mean(arr <= tp))
            p_sl = float(np.mean(arr >= sl))

        ev_pips = p_tp * tp_pips - p_sl * sl_pips

        # Quality grade
        if p_tp > 0.6 and ev_pips > 15: grade = "A"
        elif p_tp > 0.5 and ev_pips > 5: grade = "B"
        elif p_tp > 0.4 and ev_pips > 0: grade = "C"
        elif ev_pips > -10: grade = "D"
        else: grade = "F"

        self._json(200, {
            "p_tp_reach": round(p_tp, 4), "p_sl_hit": round(p_sl, 4),
            "p_neither": round(1 - p_tp - p_sl, 4),
            "expected_value_pips": round(ev_pips, 1),
            "tp_pips": round(tp_pips, 1), "sl_pips": round(sl_pips, 1),
            "forecast_horizon_bars": len(quantiles),
            "forecast_confidence": 0.7, "quality_grade": grade,
            "notes": f"P(TP)={p_tp:.0%} P(SL)={p_sl:.0%} EV={ev_pips:+.1f}p grade={grade}",
        })

    def _handle_reconcile(self, body):
        rule_shape = body.get("rule_shape", "").upper()
        tfm_shape = body.get("forecast_shape", "").upper()
        confidence = body.get("forecast_confidence", 0.5)

        # Simple agreement logic
        if rule_shape == tfm_shape:
            agreement = "AGREE"
            fallback = False
            delta = 0.0
        elif rule_shape in ("BS", "PBS") and tfm_shape in ("BS", "PBS"):
            agreement = "AGREE"
            fallback = False
            delta = 0.1
        elif rule_shape in ("SS", "WLS") and tfm_shape in ("SS", "WLS"):
            agreement = "AGREE"
            fallback = False
            delta = 0.1
        elif abs(ord(rule_shape[0]) - ord(tfm_shape[0])) <= 2 if rule_shape and tfm_shape else False:
            agreement = "ADJACENT"
            fallback = False
            delta = 0.3
        else:
            agreement = "DISAGREE"
            fallback = False  # TimesFM is advisory only — never trigger scalp-only fallback
            delta = 0.5

        self._json(200, {
            "rule_based_shape": rule_shape, "timesfm_shape": tfm_shape,
            "confidence_delta": delta, "agreement_level": agreement,
            "timesfm_confidence": confidence,
            "should_fallback_to_scalp_only": fallback,
            "notes": f"Rule={rule_shape} vs TimesFM={tfm_shape} → {agreement}",
        })

    def _json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, *args):
        pass  # Suppress request logging


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8084), Handler)
    print("[TimesFM] Server listening on :8084", file=sys.stderr)
    server.serve_forever()
