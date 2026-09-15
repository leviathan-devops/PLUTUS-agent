/**
 * TimesFM Client — bridge to the Python TimesFM probabilistic overlay.
 *
 * Plutus TS does NOT reimplement TimesFM in TypeScript. Instead it spawns a
 * resident Python subprocess that loads the standalone `timesfm` PyPI package
 * (google/timesfm) once and stays alive, communicating via stdin/stdout JSON.
 * This avoids the multi-second model load on every forecast call.
 *
 * The Python bridge supports three operations:
 *   - forecast           : OHLC closes → point + quantile forecast + shape
 *   - assess_probability : forecast distribution + entry/SL/TP → P(TP)/P(SL)
 *   - reconcile_shape    : forecast shape vs rule-based shape → agreement
 *
 * Graceful degradation: if `timesfm`/`torch` is not installed in the runtime
 * Python, the subprocess reports `available: false` on init and exits. Every
 * public method then returns null and Plutus runs structural-only. This makes
 * the overlay strictly non-fatal.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { z } from 'zod';
import type { PlutusConfig, OHLCBar, ForecastResult, ProbabilityAssessment } from '../types.js';
import { Logger } from '../utils/logger.js';
import {
  TIMESFM_INIT_HANDSHAKE_TIMEOUT_MS,
  TIMESFM_INIT_POLL_INTERVAL_MS,
  TIMESFM_REQUEST_TIMEOUT_MS,
  TIMESFM_BRIDGE_DEFAULT_HORIZON,
} from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Zod schemas for Python JSON bridge response validation
// ═══════════════════════════════════════════════════════════════════════════════

const RawForecastResultSchema = z.object({
  instrument: z.string(),
  timeframe: z.string(),
  horizon_bars: z.number(),
  point_forecast: z.array(z.number()),
  quantile_forecast: z.array(z.number()),
  shape_classification: z.string(),
  shape_confidence: z.number(),
  consolidation_probability: z.number(),
  trend_direction_probability: z.number(),
  context_mean: z.number(),
  context_std: z.number(),
  last_close: z.number(),
  generated_at: z.number(),
});

const RawProbabilityAssessmentSchema = z.object({
  p_tp_reach: z.number(),
  p_sl_hit: z.number(),
  p_neither: z.number(),
  expected_value_pips: z.number(),
  tp_pips: z.number(),
  sl_pips: z.number(),
  forecast_horizon_bars: z.number(),
  forecast_confidence: z.number(),
  quality_grade: z.string(),
  notes: z.string(),
});

const RawReconcileShapeResultSchema = z.object({
  rule_based_shape: z.string(),
  timesfm_shape: z.string(),
  confidence_delta: z.number(),
  agreement_level: z.string(),
  timesfm_confidence: z.number(),
  should_fallback_to_scalp_only: z.boolean(),
  notes: z.string(),
});

const log = new Logger('TimesFMClient');

// ═══════════════════════════════════════════════════════════════════════════════
// Python bridge script.
//
// No TypeScript interpolation is used inside the body (the ${} below only appear
// in this comment). All runtime config reaches Python via environment variables
// (PLUTUS_TIMESFM_REPO, PLUTUS_TIMESFM_HORIZON), which keeps the script a plain,
// copy-pasteable Python program.
// ═══════════════════════════════════════════════════════════════════════════════

const PYTHON_BRIDGE_SCRIPT = `
import sys, json, os, time

def _emit(obj):
    """Write one JSON object line to stdout and flush."""
    sys.stdout.write(json.dumps(obj, default=float) + "\\n")
    sys.stdout.flush()

def _reply(req_id, result):
    _emit({"id": req_id, "result": result})

def _fail(req_id, msg):
    _emit({"id": req_id, "error": str(msg)})

# ─── Model load with graceful degradation ──────────────────────────────────
MODEL_LOADED = False
LOAD_ERROR = ""
tfm = None
_TFM_API = None   # "2.0" (torch) or "1.0" (jax/flax) — set during load
BACKEND = "cpu"
REPO = os.environ.get("PLUTUS_TIMESFM_REPO", "google/timesfm-1.0-200m-pytorch")
HORIZON = int(os.environ.get("PLUTUS_TIMESFM_HORIZON", "64"))

try:
    import numpy as np

    # GPU detection: torch first, then jax
    _gpu = False
    try:
        import torch
        _gpu = bool(torch.cuda.is_available())
    except Exception:
        pass
    if not _gpu:
        try:
            import jax
            _gpu = len(jax.devices("gpu")) > 0
        except Exception:
            pass
    BACKEND = "gpu" if _gpu else "cpu"

    import timesfm
    # --- TimesFM 2.x API (preferred: pure torch, no JAX dependency) ---
    if hasattr(timesfm, "TimesFM_2p5_200M_torch"):
        try:
            _repo2 = os.environ.get("PLUTUS_TIMESFM_REPO_2", "google/timesfm-2.5-200m-pytorch")
            tfm = timesfm.TimesFM_2p5_200M_torch.from_pretrained(_repo2, torch_compile=False)
            tfm.compile(timesfm.ForecastConfig(
                max_context=1024,
                max_horizon=HORIZON,
                per_core_batch_size=32,
                use_continuous_quantile_head=True,
            ))
            _TFM_API = "2.0"
            REPO = _repo2
            MODEL_LOADED = True
            LOAD_ERROR = ""
        except Exception as e:
            LOAD_ERROR = "TimesFM 2.0 load failed: " + type(e).__name__ + ": " + str(e)
            tfm = None
    # --- TimesFM 1.x API (fallback: JAX/flax backend) ---
    if not MODEL_LOADED and hasattr(timesfm, "TimesFm"):
        try:
            tfm = timesfm.TimesFm(
                hparams=timesfm.TimesFmHparams(
                    backend=BACKEND,
                    per_core_batch_size=32,
                    horizon_len=HORIZON,
                ),
                checkpoint=timesfm.TimesFmCheckpoint(huggingface_repo_id=REPO),
            )
            _TFM_API = "1.0"
            MODEL_LOADED = True
            LOAD_ERROR = ""
        except Exception as e:
            LOAD_ERROR = type(e).__name__ + ": " + str(e)
            MODEL_LOADED = False
    if not MODEL_LOADED and not LOAD_ERROR:
        LOAD_ERROR = "No compatible TimesFM API found (neither 2.x nor 1.x)."
except Exception as e:
    LOAD_ERROR = type(e).__name__ + ": " + str(e)
    MODEL_LOADED = False

_emit({
    "type": "init",
    "available": MODEL_LOADED,
    "backend": BACKEND,
    "api": _TFM_API or "",
    "repo": REPO if MODEL_LOADED else "",
    "error": "" if MODEL_LOADED else LOAD_ERROR,
})
if not MODEL_LOADED:
    # Nothing more we can do — Plutus will run structural-only.
    sys.exit(0)


# ─── Forecast helpers ──────────────────────────────────────────────────────

def _do_model_forecast(arr):
    """Call tfm.forecast adapting to API differences across versions.
    Returns (mean[1D float64], quantiles[2D float64 (num_q, horizon)])."""
    if _TFM_API == "2.0":
        # TimesFM 2.x: forecast(horizon, inputs) -> (median[S,H], full[S,H,Q])
        _median, _full = tfm.forecast(horizon=HORIZON, inputs=[np.asarray(arr, dtype=np.float32)])
        mean = np.asarray(_median[0], dtype=np.float64).ravel()
        qf = np.asarray(_full[0], dtype=np.float64)        # (H, Q)
        qf = qf.T if qf.ndim == 2 else qf.reshape(1, -1)   # -> (Q, H)
        return mean, qf

    # --- TimesFM 1.x API ---
    preds = None
    last_err = None
    for call in (
        lambda: tfm.forecast([arr], freq=[0]),
        lambda: tfm.forecast([arr], freq=[0], normalize=True),
        lambda: tfm.forecast([arr], normalize=True),
        lambda: tfm.forecast([arr]),
    ):
        try:
            preds = call()
            break
        except Exception as e:
            last_err = e
            continue
    if preds is None:
        raise (last_err if last_err else RuntimeError("tfm.forecast returned no output"))

    p = preds[0]
    mean = np.asarray(getattr(p, "mean", None), dtype=np.float64).ravel()
    qf = getattr(p, "quantile_forecast", None)
    if qf is None:
        qf = getattr(p, "quantiles", None)
    qf = np.asarray(qf, dtype=np.float64) if qf is not None else np.empty((0, 0))
    if qf.ndim == 1:
        qf = qf.reshape(1, -1)
    # Orient to (num_quantiles, horizon): the horizon dim must match len(mean).
    H = len(mean)
    if H > 0 and qf.shape[1] != H and qf.shape[0] == H:
        qf = qf.T
    return mean, qf


def _orient_qf(qf, horizon):
    """Recover a (num_quantiles, horizon) array from whatever the wire gave us.
    The TS side flattens a (num_q, H) array row-major, so reshape(-1, H) inverts it."""
    if qf.size == 0:
        return qf.reshape(0, 0)
    if qf.ndim == 1:
        if horizon > 0 and qf.size % horizon == 0:
            return qf.reshape(-1, horizon)          # (num_q, H)
        return qf.reshape(1, -1)
    if qf.ndim == 2 and qf.shape[1] != horizon and qf.shape[0] == horizon:
        return qf.T                                  # (H, num_q) -> (num_q, H)
    return qf


def _classify_shape(mean, qf, last_close, ctx_std):
    """Derive a human-meaningful shape label + derived probabilities from the
    forecast trajectory. Pure numpy — no model call."""
    n = len(mean)
    if n == 0:
        return "unknown", 0.0, 0.0, 0.0

    x = np.arange(n, dtype=np.float64)
    if n > 1:
        coef = np.polyfit(x, mean, 1)
        slope = float(coef[0])
        intercept = float(coef[1])
    else:
        slope, intercept = 0.0, float(mean[0])

    scale = abs(last_close) + 1e-12
    rel_slope = slope / scale * 100.0           # % drift per bar
    spread_pct = float(mean.max() - mean.min()) / scale

    # Goodness of linear fit (trend strength)
    if n > 2:
        fit = slope * x + intercept
        ss_res = float(np.sum((mean - fit) ** 2))
        ss_tot = float(np.sum((mean - mean.mean()) ** 2)) + 1e-12
        r2 = 1.0 - ss_res / ss_tot
    else:
        r2 = 0.0
    trend_prob = float(np.clip(max(r2, 0.0), 0.0, 0.95))

    # Reversal: meaningful opposing half-slopes (normalised, noise-robust).
    rel_noise = (ctx_std / scale) if ctx_std > 0 else max(spread_pct, 1e-9)
    half = max(1, n // 2)
    s1r = (float(np.polyfit(x[:half], mean[:half], 1)[0]) / scale * 100.0) if half > 1 else 0.0
    s2r = (float(np.polyfit(x[half:], mean[half:], 1)[0]) / scale * 100.0) if (n - half) > 1 else 0.0
    reversal = (s1r * s2r < 0) and (abs(s1r) > 0.02) and (abs(s2r) > 0.02)

    # Consolidation: weak trend AND forecast range tight relative to noise.
    range_tight = float(np.clip(1.0 - spread_pct / (rel_noise * 3.0 + 1e-9), 0.0, 1.0))
    consol_prob = float(np.clip((1.0 - trend_prob) * range_tight, 0.0, 0.95))

    if reversal:
        shape, conf = "reversal", float(np.clip(abs(s1r - s2r) / 1.0, 0.2, 0.9))
    elif consol_prob > 0.6:
        shape, conf = "consolidation", consol_prob
    elif rel_slope > 0.02:
        shape, conf = "uptrend", trend_prob
    elif rel_slope < -0.02:
        shape, conf = "downtrend", trend_prob
    else:
        shape, conf = "transition", float(np.clip(1.0 - max(consol_prob, trend_prob), 0.1, 0.7))

    return shape, float(np.clip(conf, 0.0, 0.98)), consol_prob, trend_prob


# ─── Operation handlers ────────────────────────────────────────────────────

def op_forecast(req):
    instrument = req.get("instrument", "UNKNOWN")
    timeframe = req.get("timeframe", "4H")
    horizon_bars = int(req.get("horizon_bars", HORIZON))
    ohlc = req.get("ohlc") or []

    if not ohlc:
        _fail(req.get("id", "?"), "forecast requires non-empty ohlc")
        return

    closes = np.array([bar[3] for bar in ohlc], dtype=np.float32)
    last_close = float(closes[-1])

    # TimesFM needs a minimum context; pad by edge-repeat if very short.
    if len(closes) < 32:
        pad = np.repeat(closes[:1], 32 - len(closes)) if len(closes) else np.zeros(32, dtype=np.float32)
        closes = np.concatenate([pad.astype(np.float32), closes])

    ctx_mean = float(np.mean(closes))
    ctx_std = float(np.std(closes))

    mean, qf = _do_model_forecast(closes)

    # Trim/extend to requested horizon
    mean = mean[:horizon_bars] if len(mean) >= horizon_bars else mean
    qf_h = qf[:, :horizon_bars] if (qf.size and qf.shape[1] >= horizon_bars) else qf

    shape, conf, consol_prob, trend_prob = _classify_shape(mean, qf_h, last_close, ctx_std)

    _reply(req.get("id", "?"), {
        "instrument": instrument,
        "timeframe": timeframe,
        "horizon_bars": int(len(mean)),
        "point_forecast": mean.tolist(),
        "quantile_forecast": (qf_h.flatten().tolist() if qf_h.size else mean.tolist()),
        "shape_classification": shape,
        "shape_confidence": float(conf),
        "consolidation_probability": float(consol_prob),
        "trend_direction_probability": float(trend_prob),
        "context_mean": ctx_mean,
        "context_std": ctx_std,
        "last_close": last_close,
        "generated_at": time.time(),
    })


def op_assess_probability(req):
    rid = req.get("id", "?")
    entry = float(req["entry"])
    sl = float(req["sl"])
    tp = float(req["tp"])
    direction = req.get("direction", "")
    spread_pips = float(req.get("spread_pips", 0.0))
    pip_value = float(req.get("pip_value", 0.0001))
    horizon_bars = int(req.get("forecast_horizon_bars", 0)) or None

    mean = np.asarray(req.get("point_forecast", []), dtype=np.float64)
    qf = np.asarray(req.get("quantile_forecast", []), dtype=np.float64)
    last_close = float(req.get("last_close", 0.0))
    ctx_std = float(req.get("context_std", 0.0))

    if mean.size == 0:
        _fail(rid, "assess_probability requires a forecast (point_forecast empty)")
        return

    if isinstance(direction, str):
        is_long = direction.strip().lower() in ("long", "buy", "bull", "up")
    else:
        is_long = bool(tp > entry)

    qf = _orient_qf(qf, len(mean))

    # Build a sample ensemble: mean path + each quantile path.
    paths = [mean]
    if qf.ndim == 2:
        for i in range(qf.shape[0]):
            paths.append(qf[i])
    samples = np.vstack(paths)  # (S, H)
    if horizon_bars:
        samples = samples[:, :horizon_bars] if samples.shape[1] >= horizon_bars else samples
    S, H = samples.shape

    # First-passage: for each sample path, find the first bar TP/SL is touched.
    tp_first = np.full(S, H + 1, dtype=np.int64)
    sl_first = np.full(S, H + 1, dtype=np.int64)
    if is_long:
        for s in range(S):
            p = samples[s]
            th = np.where(p >= tp)[0]
            sh = np.where(p <= sl)[0]
            if th.size:
                tp_first[s] = th[0]
            if sh.size:
                sl_first[s] = sh[0]
    else:
        for s in range(S):
            p = samples[s]
            th = np.where(p <= tp)[0]
            sh = np.where(p >= sl)[0]
            if th.size:
                tp_first[s] = th[0]
            if sh.size:
                sl_first[s] = sh[0]

    p_tp = float(np.mean(tp_first < sl_first))
    p_sl = float(np.mean(sl_first < tp_first))
    p_neither = float(np.mean((tp_first > H) & (sl_first > H)))

    tp_dist = abs(tp - entry)
    sl_dist = abs(entry - sl)
    tp_pips = tp_dist / (pip_value if pip_value else 1e-9)
    sl_pips = sl_dist / (pip_value if pip_value else 1e-9)
    ev_pips = p_tp * tp_pips - p_sl * sl_pips - spread_pips

    confidence = float(np.clip(p_tp + 0.5 * p_neither, 0.0, 1.0))

    if ev_pips > 25.0 and p_tp > 0.55:
        grade = "A"
    elif ev_pips > 8.0 and p_tp > 0.42:
        grade = "B"
    elif ev_pips > -8.0:
        grade = "C"
    elif ev_pips > -25.0:
        grade = "D"
    else:
        grade = "F"

    bias = "long" if is_long else "short"
    notes = "TimesFM first-passage over %d ensemble paths (%s). P(TP)=%.2f P(SL)=%.2f EV=%.1fpips" % (
        S, bias, p_tp, p_sl, ev_pips)

    _reply(rid, {
        "p_tp_reach": p_tp,
        "p_sl_hit": p_sl,
        "p_neither": p_neither,
        "expected_value_pips": ev_pips,
        "tp_pips": tp_pips,
        "sl_pips": sl_pips,
        "forecast_horizon_bars": int(H),
        "forecast_confidence": confidence,
        "quality_grade": grade,
        "notes": notes,
    })


# Shape similarity for reconciliation
_SHAPE_AXIS = {
    "uptrend": 1.0, "bull": 1.0, "rally": 1.0,
    "downtrend": -1.0, "bear": -1.0, "selloff": -1.0,
    "consolidation": 0.0, "range": 0.0, "chop": 0.0,
    "transition": 0.0, "neutral": 0.0,
    "reversal": 0.5, "reversal_up": 0.7, "reversal_down": -0.7,
}


def _shape_agreement(rule_shape, ts_shape):
    ra = _SHAPE_AXIS.get(str(rule_shape).strip().lower())
    ta = _SHAPE_AXIS.get(str(ts_shape).strip().lower())
    if ra is None or ta is None:
        return 0.5, "ADJACENT"
    if ra == ta:
        return 0.95, "AGREE"
    # same sign (both bullish/bearish family)
    if ra * ta > 0:
        return 0.7, "ADJACENT"
    # one is neutral/range
    if ra == 0.0 or ta == 0.0:
        return 0.45, "ADJACENT"
    # opposite directions
    if (ra > 0) != (ta > 0):
        return 0.15, "DISAGREE"
    return 0.5, "ADJACENT"


def op_reconcile_shape(req):
    rid = req.get("id", "?")
    rule_shape = str(req.get("rule_shape", "unknown"))
    mean = np.asarray(req.get("point_forecast", []), dtype=np.float64)
    qf = np.asarray(req.get("quantile_forecast", []), dtype=np.float64)
    last_close = float(req.get("last_close", 0.0))
    ctx_std = float(req.get("context_std", 0.0))
    ts_conf_in = float(req.get("shape_confidence", 0.5))

    if mean.size == 0:
        _fail(rid, "reconcile_shape requires a forecast")
        return

    qf = _orient_qf(qf, len(mean))

    ts_shape, ts_conf, _, _ = _classify_shape(mean, qf, last_close, ctx_std)
    agreement, level = _shape_agreement(rule_shape, ts_shape)

    if level == "AGREE":
        should_scalp = False
    elif level == "ADJACENT":
        should_scalp = agreement < 0.5
    else:
        should_scalp = True

    delta = ts_conf - ts_conf_in
    notes = "rule=%s timesfm=%s agreement=%.2f level=%s" % (rule_shape, ts_shape, agreement, level)

    _reply(rid, {
        "rule_based_shape": rule_shape,
        "timesfm_shape": ts_shape,
        "confidence_delta": float(delta),
        "agreement_level": level,
        "timesfm_confidence": float(ts_conf),
        "should_fallback_to_scalp_only": bool(should_scalp),
        "notes": notes,
    })


# ─── Main loop ─────────────────────────────────────────────────────────────
HANDLERS = {
    "forecast": op_forecast,
    "assess_probability": op_assess_probability,
    "assess_setup": op_assess_probability,   # legacy alias
    "reconcile_shape": op_reconcile_shape,
}

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req = None
    try:
        req = json.loads(line)
        rid = req.get("id", "?")
        op = req.get("op") or req.get("method")
        if op == "shutdown":
            _reply(rid, "shutting down")
            break
        handler = HANDLERS.get(op)
        if handler is None:
            _fail(rid, "unknown op: " + str(op))
        else:
            handler(req)
    except Exception as e:
        rid = req.get("id", "?") if isinstance(req, dict) else "?"
        _fail(rid, e)
`;

/**
 * Message shape for the JSON protocol spoken over stdin/stdout with the
 * Python TimesFM bridge. Every line the bridge writes to stdout is parsed
 * as JSON and dispatched to {@link TimesFMClient.handleMessage}.
 *
 * - `init` messages carry availability and backend info.
 * - Response messages carry a correlation `id`, optional `error`, and the
 *   `result` payload (validated downstream by Zod schemas).
 */
interface TimesfmBridgeMessage {
  type?: string;
  available?: boolean;
  backend?: string;
  error?: string;
  id?: string;
  result?: unknown;
}

export class TimesFMClient {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private available = false;
  private pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private requestIdCounter = 0;
  private initPromise: Promise<void> | null = null;
  private initResolved = false;

  constructor(private config: PlutusConfig) {}

  /**
   * Spawn the Python bridge process and load the TimesFM model.
   * Idempotent — only spawns once per process. Non-fatal on failure.
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    if (!this.config.timesfmEnabled) {
      log.info('TimesFM disabled in config — skipping Python bridge');
      this.initResolved = true;
      return;
    }

    try {
      const pythonPath = process.env.PLUTUS_PYTHON ?? 'python3.11';
      if (typeof pythonPath !== 'string' || pythonPath.length === 0) {
        throw new Error('[TimesFM] Invalid Python path');
      }
      this.proc = spawn(pythonPath, ['-c', PYTHON_BRIDGE_SCRIPT], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONFAULTHANDLER: '1',
          PLUTUS_TIMESFM_REPO: this.config.timesfmModelId,
          PLUTUS_TIMESFM_HORIZON: String(TIMESFM_BRIDGE_DEFAULT_HORIZON),
        },
      });

      this.proc.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const msg = JSON.parse(line) as Record<string, unknown>;
            this.handleMessage(msg as TimesfmBridgeMessage);
          } catch {
            log.debug(`Python stdout (non-JSON): ${line}`);
          }
        }
      });

      this.proc.stderr.on('data', (data: Buffer) => {
        const txt = data.toString().trim();
        if (txt) log.debug(`Python stderr: ${txt}`);
      });

      this.proc.on('exit', (code) => {
        log.info(`TimesFM bridge exited (code ${code})`);
        this.available = false;
        this.proc = null;
        this.initResolved = true;
        // Reject any still-pending requests.
        for (const [, p] of this.pendingRequests) {
          p.reject(new Error('TimesFM bridge exited'));
        }
        this.pendingRequests.clear();
      });

      this.proc.on('error', (err) => {
        log.warn(`TimesFM bridge spawn error: ${err.message}`);
        this.available = false;
        this.initResolved = true;
      });

      // Wait for the init handshake (model download on first run can be slow).
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Not fatal: resolve so init() completes; overlay stays unavailable.
          log.warn('TimesFM init handshake timed out — overlay will run structural-only');
          resolve();
        }, TIMESFM_INIT_HANDSHAKE_TIMEOUT_MS);

        const checkInit = () => {
          if (this.initResolved) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkInit, TIMESFM_INIT_POLL_INTERVAL_MS);
          }
        };
        checkInit();
      });
    } catch (e) {
      log.error('Failed to spawn TimesFM bridge:', e instanceof Error ? e.message : String(e));
      this.available = false;
      this.initResolved = true;
    }
  }

  private handleMessage(msg: TimesfmBridgeMessage): void {
    if (msg.type === 'init') {
      this.available = msg.available === true;
      this.initResolved = true;
      if (this.available) {
        log.info(`TimesFM bridge initialized — model loaded (backend=${msg.backend ?? 'cpu'})`);
      } else {
        log.warn(`TimesFM overlay unavailable: ${msg.error ?? 'unknown'} — running structural-only`);
      }
      return;
    }

    if (msg.id && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id)!;
      this.pendingRequests.delete(msg.id);
      if (msg.error) {
        reject(new Error(msg.error));
      } else {
        resolve(msg.result);
      }
    }
  }

  private async request(op: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.available || !this.proc) {
      return null;
    }

    const id = `req_${++this.requestIdCounter}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`TimesFM request ${op} timeout`));
      }, TIMESFM_REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });

      const req = JSON.stringify({ id, op, ...params });
      this.proc!.stdin.write(req + '\n');
    });
  }

  async forecast(
    instrument: string,
    timeframe: string,
    horizonBars: number,
    ohlc: OHLCBar[],
  ): Promise<ForecastResult | null> {
    if (!this.available) return null;
    try {
      const raw = await this.request('forecast', {
        instrument,
        timeframe,
        horizon_bars: horizonBars,
        ohlc: ohlc.map((b) => [b.open, b.high, b.low, b.close, b.volume]),
      });
      if (!raw) return null;
      const result = RawForecastResultSchema.parse(raw);
      return {
        instrument: result.instrument,
        timeframe: result.timeframe,
        horizonBars: result.horizon_bars,
        pointForecast: Float64Array.from(result.point_forecast),
        quantileForecast: Float64Array.from(result.quantile_forecast),
        shapeClassification: result.shape_classification,
        shapeConfidence: result.shape_confidence,
        consolidationProbability: result.consolidation_probability,
        trendDirectionProbability: result.trend_direction_probability,
        contextMean: result.context_mean,
        contextStd: result.context_std,
        lastClose: result.last_close,
        generatedAt: result.generated_at,
      };
    } catch (e) {
      log.error('TimesFM forecast failed:', e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async assessSetup(
    forecast: ForecastResult,
    entry: number,
    sl: number,
    tp: number,
    direction: string,
    spreadPips: number,
    pipValue: number,
  ): Promise<Partial<ProbabilityAssessment> | null> {
    if (!this.available) return null;
    try {
      const raw = await this.request('assess_probability', {
        point_forecast: Array.from(forecast.pointForecast),
        quantile_forecast: Array.from(forecast.quantileForecast),
        last_close: forecast.lastClose,
        context_std: forecast.contextStd,
        forecast_horizon_bars: forecast.horizonBars,
        entry,
        sl,
        tp,
        direction,
        spread_pips: spreadPips,
        pip_value: pipValue,
      });
      if (!raw) return null;
      const result = RawProbabilityAssessmentSchema.parse(raw);
      return result as Partial<ProbabilityAssessment>;
    } catch (e) {
      log.error('TimesFM assess_probability failed:', e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async reconcileShape(
    ruleShape: string,
    forecast: ForecastResult,
  ): Promise<{
    rule_based_shape: string;
    timesfm_shape: string;
    confidence_delta: number;
    agreement_level: string;
    timesfm_confidence: number;
    should_fallback_to_scalp_only: boolean;
    notes: string;
  } | null> {
    if (!this.available) return null;
    try {
      const raw = await this.request('reconcile_shape', {
        rule_shape: ruleShape,
        point_forecast: Array.from(forecast.pointForecast),
        quantile_forecast: Array.from(forecast.quantileForecast),
        shape_confidence: forecast.shapeConfidence,
        last_close: forecast.lastClose,
        context_std: forecast.contextStd,
      });
      if (!raw) return null;
      const result = RawReconcileShapeResultSchema.parse(raw);
      return result as {
        rule_based_shape: string;
        timesfm_shape: string;
        confidence_delta: number;
        agreement_level: string;
        timesfm_confidence: number;
        should_fallback_to_scalp_only: boolean;
        notes: string;
      };
    } catch (e) {
      log.error('TimesFM reconcile_shape failed:', e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async shutdown(): Promise<void> {
    if (this.proc) {
      try {
        await this.request('shutdown', {});
      } catch {
        log.debug('TimesFM shutdown request failed (non-fatal)');
      }
      this.proc.kill();
      this.proc = null;
    }
    this.available = false;
  }
}
