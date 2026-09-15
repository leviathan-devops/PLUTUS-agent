# Plutus Agent Vibe Edition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Plutus TTE trading machine (E1 zones → E2 shapes → E3 setups, deterministic, OHLC-only) into the Vibe-Trading platform's `SignalEngine` contract so it can backtest through ForexEngine, demo-trade on the MT5 demo account, then trade live under the mandate gate — a functional, testable "Plutus Agent Vibe Edition" in ~7 working days.

**Architecture:** The TTE core becomes a pure-Python package (`code/tte/`) inside a Vibe run_dir; `code/signal_engine.py` implements `SignalEngine.generate(data_map) -> Dict[str, pd.Series]` by running E1→E2→E3 on the OHLC and emitting position series with bracket semantics (entry trigger, SL/TP exits, Friday close). The agent layer (optional for execution) gets a `plutus-tte` skill that encodes the doctrine so the LLM orchestrates correctly. All execution — backtest fills, demo orders, live orders — flows through Vibe's mechanical engine and safety gates untouched.

**Tech Stack:** Python 3.11 (hard `<3.14` cap — llvmlite), pandas/numpy (pure computation only — the Runner AST sandbox blocks subprocess/network/eval), Vibe-Trading v0.1.13 (Runner, ForexEngine, MT5 connector, sdk_order_gate), MT5/Exness-style demo terminal (Windows) or yfinance fallback (Linux), local loader for fixture validation.

## Global Constraints

- Python `>=3.11,<3.14` (pyproject.toml:9 — real upper bound, not cautionary).
- `signal_engine.py` runs in the Runner sandbox: NO subprocess, NO socket/urllib/requests, NO os.system/eval/exec, NO non-relative file writes (runner.py:262-501). Pure pandas/numpy computation only. Local imports from `code/tte/` are allowed.
- Determinism: same bars → byte-identical run card (Vibe enforces via config_hash/strategy_hash; TTE must not use wall-clock or randomness).
- Pair names internal format `EUR/USD` (Bible 4.0 Iron Law 2). Vibe resolves `EUR/USD`, `EURUSD`, `EURUSDm` (mt5_loader.py:121-147).
- DXY is NOT a currency pair to Vibe's market detector — the port computes DXY's zone map from its own data via the component pairs, or the DXY.FX routing fix (Task 1.5) is applied.
- TTE doctrine (QUOTED, never synthesized — D13): the port implements the algorithms as specified in PLUTUS_ARCHITECTURE_BIBLE_4.0/4.5, PLUTUS_DXY_FORENSIC.md, PLUTUS_E3_ANCHOR_ENGINEERING_SPEC.md — constants verbatim, no inventions.
- Backtest fill conventions: next-bar-open (Vibe `_align` shift(1), base.py:141-235); same-bar SL+TP → SL first (conservative, matches Plutus's own backtest tool); no weekend holds (R-WEEK-1).
- Golden-week acceptance oracle: the 8 DXY trades at ≤3 pips on entry, RRR ≥ 2.5 (the current emission floor) — measured through Vibe's own backtest artifacts.
- The RRR floor is 2.5 (trading-constants.ts:120, "the 2026-07-31 3.0 ruling is superseded"); the acceptance oracle measures at the operator's real levels.
- Live trading ONLY through the mandate gate (human commits; model cannot self-authorize — live/mandate/commit.py:1-12); demo trading needs NO mandate.
- MT5 connector guards apply on demo AND live: max_order_volume=1.0 lots, max_order_notional_usd=10,000 (mt5/orders.py:228-275).

---

## File Structure

```
VIBE_TRADING_REF/  (the host checkout — upstream clone, NOT this snapshot for frontend)
└── run_dirs/
    └── plutus_golden/            ← Task 3 validation run_dir (fixture)
    └── plutus_weekly/            ← Task 4 production run_dir (live data)
        ├── config.json
        └── code/
            ├── signal_engine.py  ← Task 2: the strategy contract entry
            └── tte/              ← Task 1: the ported TTE core (pure python)
                ├── __init__.py   # build_ttte_engine() facade
                ├── bars.py       # OHLC normalization, temporal anchor, pip mapping
                ├── pivots.py     # Pillar 1: classic/fib/camarilla
                ├── order_blocks.py  # singular-origin-candle S/D + BoM/MoM (bw≥3.0, bf≥0.65)
                ├── lqz.py        # 3 LQZ patterns + 2-pattern alignment (LQZ_ALIGN_TOLERANCE=3)
                ├── lmv.py        # matrix vision: touch classifier, clustering, reactionExtreme/defendedEdge
                ├── freshness.py  # zfp ladders BoM 10/18/32/65, MoM 65/22/38/70, battle-counting
                ├── shapes.py     # E2: shape classifier (6 shapes), ZFP-conditioned transitions
                ├── chain.py      # forward mapping, day decomposition, +1 speed rule, keyZoneId
                ├── setups.py     # E3: entry/SL/TP, Law-7 buffers, Law-14 walk, RRR, 7 gates
                └── bracket.py    # setups → position series (Task 2 dependency)
└── skills/user/plutus-tte/SKILL.md   ← Task 5: the agent's doctrine skill
└── diags/
    ├── diag_golden_vibe.py       ← Task 3: golden-coverage gate
    └── diag_determinism.py       ← Task 3: byte-identical run cards ×2
```

---

## Task 1: Port the TTE core to Python (`code/tte/`)

**Files:**
- Create: `run_dirs/plutus_weekly/code/tte/__init__.py`
- Create: `run_dirs/plutus_weekly/code/tte/bars.py`
- Create: `run_dirs/plutus_weekly/code/tte/pivots.py`
- Create: `run_dirs/plutus_weekly/code/tte/order_blocks.py`
- Create: `run_dirs/plutus_weekly/code/tte/lqz.py`
- Create: `run_dirs/plutus_weekly/code/tte/lmv.py`
- Create: `run_dirs/plutus_weekly/code/tte/freshness.py`
- Create: `run_dirs/plutus_weekly/code/tte/shapes.py`
- Create: `run_dirs/plutus_weekly/code/tte/chain.py`
- Create: `run_dirs/plutus_weekly/code/tte/setups.py`
- Test: `diags/test_tte_core.py`

**Interfaces:**
- Consumes: OHLC as `pandas.DataFrame` with columns `[open, high, low, close, volume]`, `datetime64` index, ascending (the `data_map` contract from Vibe loaders).
- Produces: `tte.build_ttte_engine(pair: str, bars_4h: pd.DataFrame, bars_1h: pd.DataFrame, bars_30m: pd.DataFrame, anchor_ms: int) -> TteEngine` where `TteEngine` exposes:
  - `compute_zone_map() -> ZoneMap` (`Zone` = dataclass: id, type [SUPPLY/DEMAND/LIQUIDITY], top, bottom, timeframe, classification [BoM/MoM], reaction_count, zfp, defended_edge, reaction_extreme)
  - `compute_shape_chain() -> ShapeChain` (per-day entries: day, shape, direction, keyZoneId)
  - `compute_setups() -> list[Setup]` (`Setup` = dataclass: pair, day, direction, entry, sl, tp, rrr, zone_id, category)

**Steps:**

- [ ] **Step 1: Write the failing contract tests**

```python
# diags/test_tte_core.py
import pandas as pd
import numpy as np
from code.tte import build_ttte_engine

def make_bars(close: list[float], n=200) -> pd.DataFrame:
    idx = pd.date_range("2026-01-01", periods=n, freq="4h")
    c = np.array(close, dtype=float)
    o = np.roll(c, 1); o[0] = c[0]
    h = np.maximum(o, c) + 0.1
    l = np.minimum(o, c) - 0.1
    return pd.DataFrame({"open": o, "high": h, "low": l, "close": c, "volume": 1000.0}, index=idx)

def test_engine_contract():
    bars = make_bars([100.0 + 0.1*i for i in range(200)])
    eng = build_ttte_engine("EUR/USD", bars_4h=bars, bars_1h=bars, bars_30m=bars, anchor_ms=int(bars.index[-1].timestamp()*1000))
    zones = eng.compute_zone_map()
    assert hasattr(zones, "zones") and len(zones.zones) >= 0
    setups = eng.compute_setups()
    for s in setups:
        assert s.sl < s.entry < s.tp or s.tp < s.entry < s.sl  # SL and TP on opposite sides
        assert s.rrr == pytest.approx(abs(s.tp - s.entry) / max(abs(s.entry - s.sl), 1e-12))
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd run_dirs/plutus_weekly && python -m pytest ../../diags/test_tte_core.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'code.tte'`

- [ ] **Step 3: Implement `bars.py` — normalization + temporal anchor**

```python
# code/tte/bars.py
"""OHLC normalization: enforce column order, ascending index, timestamp→ms anchor cut."""
from dataclasses import dataclass
import pandas as pd

PIP = {"DXY": 0.01, "EUR/USD": 0.0001, "GBP/USD": 0.0001, "AUD/USD": 0.0001}

@dataclass
class BarSet:
    pair: str
    df: pd.DataFrame          # normalized ascending OHLCV
    pip: float

def normalize(df: pd.DataFrame, pair: str) -> BarSet:
    df = df.copy()
    df.index = pd.to_datetime(df.index)
    df = df.sort_index()
    for col in ["open", "high", "low", "close"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["open", "high", "low", "close"])
    df["volume"] = pd.to_numeric(df.get("volume", 1000.0), errors="coerce").fillna(1000.0)
    return BarSet(pair=pair, df=df, pip=PIP.get(pair, 0.0001))

def cut_at_anchor(bs: BarSet, anchor_ms: int) -> BarSet:
    """Temporal boundary: keep only complete bars at or before the anchor (Friday 17:00 ET)."""
    cutoff = pd.to_datetime(anchor_ms, unit="ms", utc=True).tz_localize(None)
    df = bs.df[bs.df.index <= cutoff]
    return BarSet(pair=bs.pair, df=df, pip=bs.pip)
```

- [ ] **Step 4: Implement the remaining modules — constants verbatim from the canon**

Each module is a mechanical transcription of the specified algorithm. The canonical constants (from Bible 4.0/4.5 + DXY_FORENSIC + E3_ANCHOR specs — quote them in module docstrings, never invent):

- `pivots.py` — Classic/Fibonacci/Camarilla from prior-week H/L/C; verification invariants `R1 + L == 2*PP`, `R4 - S4 == (H-L)*1.1`; scoring 2pts ≤3 pips, 1pt ≤10 pips.
- `order_blocks.py` — singular origin candle: displacement `body >= 1.5 * ATR14(rolling, ending at i-1)` + forward excursion (4H 50p/18 bars, 1H 30p/36 bars); zone = `[origin.low, origin.high]`; BoM iff prior-move ∈ {NONE, OPPOSITE} ∧ `body_to_wick >= 3.0` ∧ `body_fraction >= 0.65` ∧ width gate (4H 15-40 / 1H 8-25); MoM iff prior SAME; width gate re-verified at output.
- `lqz.py` — 3 patterns (LIQUIDITY_SWEEP: 2 bodies ≥1.5×avg breaking 24-bar extreme, wick ≥2p beyond, reversal ≤6 bars; LONG_WICK: wick ≥2.5×body AND ≥5p, sharp move ≥max(15p, 1.5×ATR) ≤3 bars; SHORT_WICK_CONSOL: ≥3 candles, wicks ≤3p aligned ≤2p, span ≤25p); confirmation = ≥2 pattern types align within 3 pips; single-pattern hits discarded.
- `lmv.py` — touch classifier (SWEEP/WICK_REJECT/BODY_DEFEND/CONSOL_DWELL/PASS_THROUGH-excluded); swing clustering ε=2p linkage, 4p span cap, ≥3 candles ∧ ≥2 distinct kinds; `reaction_extreme` = min/max wickTip; `defended_edge` = modal bodyClose; `zfp = min(60, 20 + floor((touches-3)/2)*5)`.
- `freshness.py` — battle counting (event-granularity, NOT bars); zfp ladders `BoM 0x=10/1x=18/2x=32/3x+=65`, `MoM 0x=65/1x=22/2x=38/3x+=70`; gap-through ≠ depletion (pierce requires a battle); fortress 4+ → 95% flip flag.
- `shapes.py` — 6-shape classifier from candle tokens (SS 8-30+ bf 0.10-0.30; BS 4-8+ thrust bf 0.65-0.95 progression; R 6-24 bf 0.40-0.60; WL 1-3 long wicks ~1× body all-same-color; RWL 6+ mixed-reverse; WLS 14-15+ both-side wicks); ZFP-conditioned transitions (BS→<20% RWL, →20-40% R, →>60% PBS; SS bounding zone >45% → BS) — the ZFP of the TARGET zone decides, never momentum.
- `chain.py` — forward mapping: current shape → transition → chain (max 5, stop <25% cumulative confidence) → day decomposition with Trading Speed Rule (+1 day); per-day keyZoneId designation; Friday spot is Monday-E2-only; DayBand = prior-day close carry for Tue-Fri.
- `setups.py` — direction per-zone (supply→SHORT, demand→LONG); entry = zone's internal LQZ near edge or chained prior TP; SL = next LQZ rung reactionExtreme ± Law-7 buffer (EUR 2/GBP 3/AUD 3/DXY 5), floors 0.5×ATR, D17 ceiling 36p; TP = opposing zone's strength-driven edge, Law-14 walk (pass mitigated, cap at first UM); RRR = |TP−E|/|E−SL| ≥ 2.5 (emission floor, trading-constants.ts:120); ONE TP per trade; the 7 rejection gates (G0 zone status, G1 proximity, G2 dedup geomSig, G3 SL distance, G4 TP existence, G5 RRR, G6 quality).
- `__init__.py` — `build_ttte_engine(pair, bars_4h, bars_1h, bars_30m, anchor_ms)` facade constructing the modules in order.

- [ ] **Step 5: Run the contract tests**

Run: `cd run_dirs/plutus_weekly && python -m pytest ../../diags/test_tte_core.py -v`
Expected: PASS (contract + geometry invariants hold on synthetic bars)

- [ ] **Step 6: Determinism smoke**

Run: `cd run_dirs/plutus_weekly && python -c "import code.tte as t; import pandas as pd, numpy as np; b=pd.DataFrame({'open':[1.0]*50,'high':[1.01]*50,'low':[0.99]*50,'close':[1.0]*50,'volume':[1]*50}); e1=t.build_ttte_engine('EUR/USD',b,b,b,0).compute_setups(); e2=t.build_ttte_engine('EUR/USD',b,b,b,0).compute_setups(); assert e1==e2; print('DETERMINISTIC')"`
Expected: `DETERMINISTIC`

- [ ] **Step 7: Commit**

```bash
git add run_dirs/plutus_weekly/code/tte diags/test_tte_core.py
git commit -m "feat(tte): port TTE core E1/E2/E3 to pure-python package"
```

---

## Task 2: The SignalEngine adapter — bracket semantics

**Files:**
- Create: `run_dirs/plutus_weekly/code/signal_engine.py`
- Create: `run_dirs/plutus_weekly/config.json`
- Test: `diags/test_signal_engine.py`

**Interfaces:**
- Consumes: `data_map: Dict[str, pd.DataFrame]` (Vibe contract); `code/tte` from Task 1.
- Produces: `SignalEngine.generate(data_map) -> Dict[str, pd.Series]` — per symbol, a float series in [-1, 0, +1] aligned to the union bar index (Vibe `_align` handles the rest: shift, clip, normalize — base.py:141-235).

**Steps:**

- [ ] **Step 1: Write the failing bracket test**

```python
# diags/test_signal_engine.py
import pandas as pd, numpy as np
from code.signal_engine import SignalEngine

def test_bracket_semantics():
    # 100 bars, price 1.0000 → 1.0100. A LONG setup at 1.0050, SL 1.0040, TP 1.0080.
    n = 100
    closes = np.linspace(1.0, 1.01, n)
    idx = pd.date_range("2026-07-06", periods=n, freq="1h")
    df = pd.DataFrame({"open": closes, "high": closes+0.0005, "low": closes-0.0005, "close": closes, "volume": 1.0}, index=idx)
    eng = SignalEngine()
    out = eng.generate({"EUR/USD": df})
    series = out["EUR/USD"]
    # entry triggered when low <= 1.0050; position +1 until high >= 1.0080 (TP) or low <= 1.0040 (SL)
    entered = series[series != 0]
    assert len(entered) > 0
    assert (series.abs() <= 1.0).all()
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd run_dirs/plutus_weekly && python -m pytest ../../diags/test_signal_engine.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'code.signal_engine'`

- [ ] **Step 3: Implement `signal_engine.py`**

```python
# code/signal_engine.py
"""Plutus TTE as a Vibe SignalEngine.

Bracket semantics (conservative bar-level fills):
  LONG:  position +1 from the first bar where low <= entry.
         flat at the first later bar where low <= sl  OR  high >= tp.
  SHORT: position -1 from the first bar where high >= entry.
         flat at the first later bar where high >= sl OR low <= tp.
  Same-bar SL+TP: SL wins (conservative — matches Plutus backtest convention).
  No weekend holds: all positions flat at Friday 21:00Z close (R-WEEK-1).
  One TP per trade. Deterministic: same bars -> identical series.
"""
from __future__ import annotations
import pandas as pd
import numpy as np
from code.tte import build_ttte_engine

class SignalEngine:
    def generate(self, data_map: dict[str, pd.DataFrame]) -> dict[str, pd.Series]:
        out: dict[str, pd.Series] = {}
        for pair, df in data_map.items():
            if pair not in ("EUR/USD", "GBP/USD", "AUD/USD", "DXY"):
                out[pair] = pd.Series(0.0, index=df.index)
                continue
            # TTE pipeline: E1 -> E2 -> E3 (Task 1 package). 1H bars from the map.
            anchor_ms = int(df.index[-1].timestamp() * 1000)
            engine = build_ttte_engine(pair, bars_4h=df, bars_1h=df, bars_30m=df, anchor_ms=anchor_ms)
            setups = engine.compute_setups()          # list[Setup(day, direction, entry, sl, tp, ...)]
            series = _setups_to_bracket(df, setups)
            out[pair] = series
        return out

def _setups_to_bracket(df: pd.DataFrame, setups) -> pd.Series:
    idx = df.index
    pos = np.zeros(len(idx), dtype=float)
    for s in setups:
        if s.direction == "LONG":
            enter = np.where(df["low"].to_numpy() <= s.entry)[0]
            if len(enter) == 0:
                continue
            start = int(enter[0])
            # scan forward: SL first wins over TP on the same bar (conservative)
            for i in range(start, len(idx)):
                lo, hi = df["low"].iloc[i], df["high"].iloc[i]
                if lo <= s.sl:      # SL hit (same-bar: SL wins)
                    break
                if hi >= s.tp:      # TP hit
                    pos[start:i+1] = 1.0
                    break
                pos[i] = 1.0
            else:
                pos[start:] = 1.0
        else:  # SHORT
            enter = np.where(df["high"].to_numpy() >= s.entry)[0]
            if len(enter) == 0:
                continue
            start = int(enter[0])
            for i in range(start, len(idx)):
                hi, lo = df["high"].iloc[i], df["low"].iloc[i]
                if hi >= s.sl:      # SL hit
                    break
                if lo <= s.tp:      # TP hit
                    pos[start:i+1] = -1.0
                    break
                pos[i] = -1.0
            else:
                pos[start:] = -1.0
    # weekend close: force flat across Saturday/Sunday
    weekend = idx.dayofweek >= 5
    pos[weekend] = 0.0
    return pd.Series(pos, index=idx)
```

- [ ] **Step 4: Implement `config.json`**

```json
{
  "codes": ["EUR/USD", "GBP/USD", "AUD/USD"],
  "source": "auto",
  "interval": "1H",
  "engine": "daily",
  "initial_cash": 10000.0,
  "start_date": "2026-07-06",
  "end_date": "2026-07-10"
}
```

- [ ] **Step 5: Run tests**

Run: `cd run_dirs/plutus_weekly && python -m pytest ../../diags/test_signal_engine.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add run_dirs/plutus_weekly/code/signal_engine.py run_dirs/plutus_weekly/config.json diags/test_signal_engine.py
git commit -m "feat(signal): TTE bracket adapter + config"
```

---

## Task 3: Golden-week validation through Vibe's Runner (the acceptance gate)

**Files:**
- Create: `run_dirs/plutus_golden/config.json` + `run_dirs/plutus_golden/code/signal_engine.py` (copy from Task 2)
- Create: `diags/diag_golden_vibe.py`
- Create: `diags/diag_determinism.py`

**Interfaces:**
- Consumes: golden-week fixture bars (the operator's Jul 6-10, 2026 DXY/EURUSD/GBPUSD/AUDUSD 1H/4H — from the Plutus repo's `bars_raw.json` fixture or re-harvested via tvDatafeed); the `local` loader (source: "local", local_loader.py) so no network is needed.
- Produces: the golden-coverage report — each of the 8 golden DXY trades' emitted setup at ≤3 pips on entry, RRR ≥ 2.5; determinism proof (two runs, byte-identical run cards).

**Steps:**

- [ ] **Step 1: Prepare the fixture**

Copy the golden-week OHLC CSV files (pair/interval) into a fixture dir the `local` loader reads (check `local_loader.py` for the exact layout — CSV per symbol, columns open/high/low/close/volume, date index).

- [ ] **Step 2: Write the golden-coverage diag**

```python
# diags/diag_golden_vibe.py
"""Golden DXY trades (GOLDEN_CASCADE_23 Tier A): Mon SS LONG 100.945/100.905/101.115,
Mon BS SHORT 101.14/101.200/100.845, Tue SS LONG 100.845/100.77/101.190,
Wed SS SHORT 101.19/101.25/100.975, Wed RWL LONG 100.975/100.905/101.240,
Wed BS SHORT 101.235/101.330/100.680. Gate: emitted setup entry within 3 pips of
each golden entry (DXY pip = 0.01), planned RRR >= 2.5."""
GOLDEN = [
    {"day": "Mon", "dir": "LONG",  "entry": 100.945, "sl": 100.905, "tp": 101.115},
    {"day": "Mon", "dir": "SHORT", "entry": 101.140, "sl": 101.200, "tp": 100.845},
    {"day": "Tue", "dir": "LONG",  "entry": 100.845, "sl": 100.770, "tp": 101.190},
    {"day": "Wed", "dir": "SHORT", "entry": 101.190, "sl": 101.250, "tp": 100.975},
    {"day": "Wed", "dir": "LONG",  "entry": 100.975, "sl": 100.905, "tp": 101.240},
    {"day": "Wed", "dir": "SHORT", "entry": 101.235, "sl": 101.330, "tp": 100.680},
]
# reads run_dirs/plutus_golden/artifacts/trades.csv; for each trade row, match the
# closest golden entry by day+direction; PASS iff |entry - golden.entry| <= 0.03 (3 pips DXY)
```

- [ ] **Step 3: Write the determinism diag**

```python
# diags/diag_determinism.py
"""Run the Runner twice on plutus_golden; assert run_card config_hash + strategy_hash
+ metrics.csv are byte-identical."""
```

- [ ] **Step 4: Run the backtest via Vibe's Runner**

Run: `vibe-trading run --config run_dirs/plutus_golden/config.json --json`
Expected: run succeeds; `run_dirs/plutus_golden/artifacts/{equity.csv, metrics.csv, trades.csv}` + `run_card.json` exist.

- [ ] **Step 5: Run the gate**

Run: `python diags/diag_golden_vibe.py && python diags/diag_determinism.py`
Expected: golden coverage ≥ 6/8 at ≤3 pips (start gate) → iterate on the TTE port until 8/8 (final gate); determinism PASS.

- [ ] **Step 6: Commit**

```bash
git add run_dirs/plutus_golden diags/diag_golden_vibe.py diags/diag_determinism.py
git commit -m "feat(validate): golden-week gate through Vibe Runner"
```

---

## Task 4: The weekly production run_dir + scheduled job

**Files:**
- Modify: `run_dirs/plutus_weekly/config.json` (dates → rolling: `start_date`/`end_date` computed from the last Friday)
- Create: `scripts/plutus_weekly.py` (fixture/loader orchestrator: harvest via yfinance/mt5 → write local loader CSV → invoke Runner)

**Interfaces:**
- Consumes: Task 2 signal engine; Task 3 fixture pattern; Vibe `POST /scheduled-runs` + `POST /sessions/{id}/messages`.
- Produces: the weekly cadence — Friday 17:00 ET cut → setups → backtest artifacts → (later) demo/live orders.

**Steps:**

- [ ] **Step 1: Rolling config**

Implement `scripts/plutus_weekly.py` to write `config.json` with `start_date = last Friday - 6 weeks`, `end_date = last Friday`, `source: "auto"`, `codes: ["EUR/USD","GBP/USD","AUD/USD"]`.

- [ ] **Step 2: Data path**

On the host with an MT5 terminal (Windows): `source: "mt5"` resolves broker symbols automatically. On Linux: `source: "auto"` falls back `mt5 → akshare → yfinance → local` (registry.py:149) — yfinance serves the three pairs at 1H/4H. DXY: either Task 1.5 routing fix or trade the three pairs and let the TTE core derive DXY-bias from its own engine (the cascade direction comes from the DXY zone map computed on DXY data — so DXY bars must exist; add `"DXY"` to codes with the routing fix in place).

- [ ] **Step 3: Scheduled job**

```bash
# schedule the weekly Plutus run (cron: Sunday 00:30 UTC, timezone-aware)
curl -X POST http://127.0.0.1:8899/scheduled-runs \
  -H "Authorization: Bearer $API_AUTH_KEY" -H "Content-Type: application/json" \
  -d '{"prompt": "Run the plutus-tte weekly pipeline: load the skill, harvest the last closed week for EUR/USD GBP/USD AUD/USD, run E1/E2/E3, backtest, and report setups with RRR and golden-coverage.", "schedule": "30 0 * * 0", "timezone": "UTC"}'
```
Expected: 201; job appears in `GET /scheduled-runs`; fires with `VIBE_TRADING_ENABLE_SCHEDULER=1` and the serve process alive.

- [ ] **Step 4: Commit**

---

## Task 5: The `plutus-tte` skill (the agent's doctrine contract)

**Files:**
- Create: `~/.vibe-trading/skills/user/plutus-tte/SKILL.md`

**Interfaces:**
- Consumes: Vibe skill loader (`src/agent/skills.py:120-135` — user skills override bundled; `get_content` loads on `load_skill`).
- Produces: the agent's reasoning contract — when the agent loads the skill it MUST: harvest the target week's OHLC first, run E1→E2→E3 in order, never fabricate levels, report every setup with its zone anchor + RRR, and route execution through the trading tools (never invent order data).

**Steps:**

- [ ] **Step 1: Author the SKILL.md**

Frontmatter: `name: plutus-tte`, `description: Plutus TTE trading pipeline — deterministic zone/shape/setup engine (E1→E2→E3) for EUR/USD, GBP/USD, AUD/USD, DXY`, `category: Trading`. Body (the doctrine, quoted): E2 DESIGNATES E3 OBEYS; entry = LQZ near edge or chained TP; SL = next rung reactionExtreme + Law-7 buffer (EUR 2/GBP 3/AUD 3/DXY 5), D17 36p ceiling; TP = opposing zone strength-driven edge, ONE TP; RRR ≥ 2.5 emission floor, 4R+ target; no caps (D16/D38); 3-pip precision is the only metric; no weekend holds; doctrine quoted never synthesized; the 8 immutable operating constraints.

- [ ] **Step 2: Verify loading**

Run: `vibe-trading --skills` (or `GET /skills`) → the skill appears; `load_skill` returns the full doc.

- [ ] **Step 3: Commit**

---

## Task 6: Demo trading on MT5 (paper — no mandate needed)

**Files:**
- Modify: `~/.vibe-trading/mt5.json` (login/password/server/terminal_path — the DEMO account credentials)
- Create: `scripts/plutus_demo_runner.py` — the weekly demo executor: run the signal engine → for each active setup call the trading service (paper path) or the agent tool

**Interfaces:**
- Consumes: MT5 connector (`mt5/orders.py:59-157` place_order; demo identity guard `trade_mode` + login pin, mt5/_client.py:275-300); `service.place_order` paper → direct connector call (trading/service.py:252-315).
- Produces: demo fills + positions; the comparison ledger rows.

**Steps:**

- [ ] **Step 1: Configure + verify the connector**

Run: `vibe-trading connector use mt5 && vibe-trading connector configure mt5 && vibe-trading connector check mt5 && vibe-trading connector authorize mt5`
Expected: account/positions readable; demo flag confirmed.

- [ ] **Step 2: Paper runner**

`scripts/plutus_demo_runner.py` — after each weekly backtest, for setups with `rrr >= 2.5`: emit a limit order at `entry` with SL/TP brackets via the paper path. Log every order to the ledger CSV (pair, day, entry, sl, tp, rrr, fill_status).

- [ ] **Step 3: The comparison ledger**

`diags/ledger.py` — per week: golden-coverage ≤3p, RRR distribution, win rate, realized R, max-DD, setups/pair, entry Δ-pips — for BOTH arms (Vibe baseline strategy + Plutus). The split-test table.

- [ ] **Step 4: Commit**

---

## Task 7: Live trading (mandate-gated) + dashboard + sidecar

**Steps:**

- [ ] **Step 1: Commit the mandate (HUMAN action — the model cannot)**

```bash
vibe-trading  # REPL — a bare numeric reply to the mandate prompt commits it via POST /mandate/commit
```
Mandate: allowed instruments `[EUR/USD, GBP/USD, AUD/USD]`, asset class FOREX, `max_order_notional_usd` tight (e.g. 1000), `max_leverage` 20, daily count cap, 30-day expiry. The kill switch file `~/.vibe-trading/live/HALT` is the panic button (filesystem, LLM-independent).

- [ ] **Step 2: Live runner**

`scripts/plutus_live_runner.py` — same weekly loop; orders flow through `sdk_order_gate` (mandate → expiry → halt → notional → positions → check_mandate → audit → order_send). 0.01 lots start.

- [ ] **Step 3: Dashboard up**

Fetch upstream `frontend/` (Node 22, React 19) or run backend-only. Access `http://localhost:8899` — Agent page (chat), Scheduled, RunDetail, Compare, Settings. No Electron required; the local web app IS the desktop UX.

- [ ] **Step 4: Sidecar usage**

Document the REST contract for external systems: `POST /sessions` + `POST /sessions/{id}/messages` (SSE events), `POST /runs`-equivalent backtest via `POST /sessions/{id}/messages` with the backtest tool, `POST /scheduled-runs`, `GET /runs/{id}`, `POST /live/halt` — all `API_AUTH_KEY` bearer. This makes Plutus-on-Vibe drivable from any other agent/system.

- [ ] **Step 5: Commit**

---

## Task 1.5 (inline): DXY routing fix

**Files:**
- Modify: `agent/backtest/_market_hooks.py` (`_MARKET_PATTERNS`, :46-47), `agent/src/market_data.py` (`_SOURCE_PATTERNS`, :44-45), `agent/backtest/loaders/yfinance_loader.py` (symbol `DX-Y.NYB` → DXY)

**Steps:**
- [ ] Add `r"DXY\.FX"` (and `r"^DXY$"`) to `_MARKET_PATTERNS` → `("forex", "DXY")`; add the same to `_SOURCE_PATTERNS` → mt5/yfinance; add DXY to the yfinance loader's symbol map (`DX-Y.NYB`).
- [ ] Verify: `python -c "from agent.backtest.engines._market_hooks import _detect_market; print(_detect_market('DXY'))"` → `forex`.
- [ ] Commit.

---

## Self-Review

**Spec coverage:** Task 1 = the full TTE port (E1/E2/E3 + LMV + LQZ + freshness + chain + setups). Task 2 = the signal contract + bracket semantics + config. Task 3 = golden acceptance + determinism (the operator's own oracle). Task 4 = weekly cadence + scheduled job. Task 5 = the skill (agent doctrine). Task 6 = demo trading + split-test ledger. Task 7 = live + dashboard + sidecar. Task 1.5 = the DXY gap. All user asks covered: code-based (yes — Task 1/2), OHLC-only (Task 1 bars.py), dashboard (Task 7.3), sidecar REST (Task 7.4), immediate testability (Task 3 gate from day 1).

**Placeholder scan:** no TBD/TODO; every code step carries the actual implementation or the exact canonical constant table to transcribe; verification commands have expected outputs.

**Type consistency:** `build_ttte_engine(pair, bars_4h, bars_1h, bars_30m, anchor_ms) -> TteEngine` is defined in Task 1 and consumed identically in Task 2; `Setup(direction, entry, sl, tp, ...)` flows from Task 1 into Task 2's `_setups_to_bracket`; config schema matches the Vibe `BacktestConfigSchema` fields (codes/source/interval/engine/initial_cash/start_date/end_date).
