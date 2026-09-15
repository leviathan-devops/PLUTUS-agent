# DATA PROVENANCE — THE BROKER-CORRECTED DATA LAYER (v1 — 2026-08-06)

THE AUDIT TRAIL FOR EVERY DATA THE MACHINE MEASURES. This is the contract that
tells every future runner WHICH broker feed its candles came from, WHY that
matters, and HOW to re-fetch with the correct broker. A measurement without its
data provenance is an un-auditable measurement.

---

## 1. THE BROKER REQUIREMENT — the per-pair broker map (the operator's law)

The operator's golden trades are charted on specific brokers. The golden doc's
own headers name them:

> `EURUSD (ICE Broker Chart Data)` — **MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md:5**

> `GBPUSD (OANDA Broker Chart Data)` — **MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md:59**

The DXY is the ICE Dollar Index (TradingView's DXY symbol = the ICE index). The
operator's broker law, VERBATIM (MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md:66):

> "The golden trades are all on the ICE broker. you need to use the data from
> the same broker so the candles match... tvdatafeed should have a broker
> filter so you can get accurate data from the correct broker"

The build report's own audit verdict (MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md:56):

> "The golden doc's own headers — `EURUSD (ICE Broker Chart Data)` + `GBPUSD
> (OANDA Broker Chart Data)`. The machine's fixture = the TradingView tvDatafeed
> fetch (fetched ~07-28 — 17+ days AFTER the golden week — it even contains
> post-week bars). Three sources. Every pip measurement carries the variance."

### THE MACHINE'S BROKER MAP (scripts/fetch-bars.ts — `BROKER_MAP`)

| Pair      | Broker required | Rationale (citation)                                   | Status       |
|-----------|-----------------|--------------------------------------------------------|--------------|
| EUR/USD   | ICE             | golden doc:5 "EURUSD (ICE Broker Chart Data)"          | REQUIRED     |
| GBP/USD   | OANDA           | golden doc:59 "GBPUSD (OANDA Broker Chart Data)"       | REQUIRED     |
| DXY       | ICE             | the ICE Dollar Index (TradingView's DXY = the ICE idx) | REQUIRED     |
| AUD/USD   | PROPOSED        | the operator's default unknown — never invented        | PROPOSED     |

The AUD/USD broker is **PROPOSED** — the operator has not named a broker for it
(no golden-doc header covers AUD/USD). The fetch script will NOT invent one: it
fetches AUD/USD only after the operator confirms the broker via
`--broker=AUD/USD:<BROKER>`, and the cell otherwise records the honest
`[BROKER] PROPOSED` note. **No data for AUD/USD may be trusted until a broker is
named** — any AUD/USD measurement before that is a derived value, not a matched
chart value.

The tvdatafeed broker filter = the `exchange` parameter of `get_hist`
(the repo's ground-truth Python wrapper: `scripts/tv_datafeed.py:35`). The
exchange ids used by the fetch script are DOCUMENTED-PROPOSED and must be
verified against the installed library's exchange list on first live use —
never asserted as fact.

---

## 2. THE CURRENT FIXTURE'S PROVENANCE — the measured spans

Fixture path: `/tmp/opencode/bars_raw.json` (read-only).
Measured 2026-08-06 with the exact one-liner against the file. All 16 entries
(4 pairs × 4 timeframes), the bar counts, the first/last bar timestamps, and the
share of bars that fall AFTER the golden-week anchor.

**The golden-week anchor: `1783702800000` = 2026-07-10 17:00 UTC** (the week of
2026-07-06; the pipeline's `ANCHOR_MS` in diag-golden-coverage.ts:46). Every bar
with `timestamp > 1783702800000` is a POST-WEEK bar.

| Pair     | TF   | Count | First bar (ts)   | Last bar (ts)    | First (ISO)           | Last (ISO)        | Post-anchor bars | % post |
|----------|------|------:|------------------|------------------|-----------------------|-------------------|-----------------:|-------:|
| DXY      | 4H   | 500   | 1775494800000    | 1785207600000    | 2026-04-06 17:00      | 2026-07-28 03:00  | 72               | 14.4%  |
| DXY      | 1H   | 1500  | 1777521600000    | 1785211200000    | 2026-04-30 04:00      | 2026-07-28 04:00  | 272              | 18.1%  |
| DXY      | 30m  | 500   | 1783929600000    | 1785213000000    | 2026-07-13 08:00      | 2026-07-28 04:30  | 500              | 100.0% |
| DXY      | 15m  | 300   | 1784752200000    | 1785213900000    | 2026-07-22 20:30      | 2026-07-28 04:45  | 300              | 100.0% |
| EUR/USD  | 4H   | 500   | 1775077200000    | 1785200400000    | 2026-04-01 21:00      | 2026-07-28 01:00  | 68               | 13.6%  |
| EUR/USD  | 1H   | 1500  | 1777568400000    | 1785211200000    | 2026-04-30 17:00      | 2026-07-28 04:00  | 275              | 18.3%  |
| EUR/USD  | 30m  | 500   | 1783969200000    | 1785213000000    | 2026-07-13 19:00      | 2026-07-28 04:30  | 500              | 100.0% |
| EUR/USD  | 15m  | 300   | 1784772000000    | 1785213900000    | 2026-07-23 02:00      | 2026-07-28 04:45  | 300              | 100.0% |
| GBP/USD  | 4H   | 500   | 1775077200000    | 1785200400000    | 2026-04-01 21:00      | 2026-07-28 01:00  | 68               | 13.6%  |
| GBP/USD  | 1H   | 1500  | 1777568400000    | 1785211200000    | 2026-04-30 17:00      | 2026-07-28 04:00  | 275              | 18.3%  |
| GBP/USD  | 30m  | 500   | 1783969200000    | 1785213000000    | 2026-07-13 19:00      | 2026-07-28 04:30  | 500              | 100.0% |
| GBP/USD  | 15m  | 300   | 1784771100000    | 1785213900000    | 2026-07-23 01:45      | 2026-07-28 04:45  | 300              | 100.0% |
| AUD/USD  | 4H   | 500   | 1775077200000    | 1785200400000    | 2026-04-01 21:00      | 2026-07-28 01:00  | 68               | 13.6%  |
| AUD/USD  | 1H   | 1500  | 1777568400000    | 1785211200000    | 2026-04-30 17:00      | 2026-07-28 04:00  | 275              | 18.3%  |
| AUD/USD  | 30m  | 500   | 1783969200000    | 1785213000000    | 2026-07-13 19:00      | 2026-07-28 04:30  | 500              | 100.0% |
| AUD/USD  | 15m  | 300   | 1784772000000    | 1785213900000    | 2026-07-23 02:00      | 2026-07-28 04:45  | 300              | 100.0% |

### THE PROVENANCE VERDICT

1. **The fetch date:** the fixture's newest bar is `1785213900000` =
   2026-07-28 04:45 UTC — the file was produced **~07-28**, **17+ days after the
   golden week (2026-07-06)** and **18 days after the anchor (07-10 17:00 UTC)**.
   All 16 entries end on the same 07-28 stamp — one snapshot, one fetch.
2. **The feed:** the fixture was fetched with an **unfiltered** TradingView
   feed (no broker selection per pair). The EU should be ICE and the GU should
   be OANDA per the golden doc; the machine took whatever the default TV feed
   returned for each symbol — the **wrong source** per the operator's law.
3. **The post-week contamination:** **4573 of 7817 bars total are past the
   anchor** (the golden week's end). The 30m and 15m entries are **100%
   post-week** — their entire spans (500 / 300 recent bars) fall AFTER the
   golden week. The Wave-1 temporal gate (src/mdve/temporal.ts — `gateBars`)
   PHYSICALLY BARS these at the pipeline entry (the runners lock the run-anchor
   before any bar read — diag-golden-coverage.ts:41-50), so they cannot leak
   forward — but the fixture's composition is still wrong-broker + stale.

---

## 3. THE VARIANCE RISK — why the broker matters

The operator's words, VERBATIM (the audit's record — PLUTUS_V4.5.3_BUILD_REPORT.md):

> "these are all roughly in the right place but the precision is completely
> fucked so either the data is from the wrong broker or the code is fucked.
> probably both"

The audit's conclusion (PLUTUS_V4.5.3_BUILD_REPORT.md:56):

> "the data IS from the wrong source... every pip-level measurement in this
> session carries the broker variance."

Why: the same symbol quoted through different broker feeds carries **different
high/low/close per candle** (feed aggregation, spread, tick-source, session
gaps, rollover rules). The machine's candle-dependent mechanics (zone edges,
reaction levels, S/D anchors, entry/SL/TP precision) are **pip-exact** — a
0.5-1 pip feed delta on a 1H candle shifts a zone edge and derails every
downstream measurement. The golden doc's own entries are documented to the pip
(EU #1 entry 1.14395, EU #2 entry 1.14110, GU #1 entry 1.33330). A measurement
run on a different broker's candles cannot reproduce those pips. The variance is
**systematic, not random**: it biases every candle in the same direction per
feed, so "roughly right but precision fucked" is exactly the failure signature
of wrong-broker data.

**The rule going forward:** a measurement may claim pip-level correctness ONLY
against bars fetched from the REQUIRED broker per pair (§1). Any measurement
that runs on the old fixture is a derived value with a documented variance
caveat, never a matched chart value.

---

## 4. THE RE-FETCH PROCEDURE

### 4.1 The one-time dependency (honest)

The JS `tvdatafeed` port is NOT installed (node_modules + package.json verified
2026-08-06 — no tvdatafeed). The repo's ground-truth tvdatafeed integration is
the Python wrapper `scripts/tv_datafeed.py` (its `exchange` param = the broker
filter). Before the first live fetch, in the project root:

```
bun add tvdatafeed
```

(or `npm install tvdatafeed`). Verify the broker/exchange ids from
`scripts/fetch-bars.ts` (`BROKER_EXCHANGE_MAP`) against the installed library's
exchange list on first use.

### 4.2 The offline validation (no network, no library)

```
bun scripts/fetch-bars.ts --dry-run
```

Prints the full fetch matrix — pair × broker × exchange × timeframe × n_bars —
and exits 0. Run this FIRST to confirm the plumbing before any network touch.

### 4.3 The live re-fetch (the broker-corrected feed)

```
bun scripts/fetch-bars.ts
```

- Fetches the 4 pairs × 4 timeframes through the per-pair broker (EU → ICE,
  GU → OANDA, DXY → ICE, AUD/USD → gated until a `--broker` override).
- Writes the RawFeed contract to `/tmp/opencode/bars_raw.json` (override with
  `--out=<path>`) — the exact shape the runners consume unchanged
  (diag-golden-coverage.ts:48-50, report-v452.ts).
- Exit 0 = at least one pair fetched; non-zero = the failures, each with its
  per-cell `RawFeed.error` + the remedy, on stderr. **Never a fake success.**
- Partial re-fetch: `bun scripts/fetch-bars.ts --pairs=EUR/USD,GBP/USD`.
- Confirm the AUD/USD broker first: `bun scripts/fetch-bars.ts
  --broker=AUD/USD:OANDA` (the operator names the broker — never invented).

### 4.4 The post-fetch verification (mandatory)

1. **Bar counts** — the re-fetched file must match the lookback (1H 1500, 4H 500,
   30m 500, 15m 300 per pair) within the feed's availability:
   ```
   python3 -c "
   import json
   for r in json.load(open('/tmp/opencode/bars_raw.json')):
       print(r['pair'], r['timeframe'], len(r['bars']), r['error'])
   "
   ```
   Every entry must carry `error: null`.
2. **The spot checks vs the operator's documented levels** (the golden doc):
   - EU #1 entry 1.14395 (golden doc:6)
   - EU #2 entry 1.14110 (golden doc:12)
   - GU #1 entry 1.33330 (golden doc:61)
   The re-fetched ICE/OANDA candles at the golden-week anchors must reproduce
   these levels to the pip. If they don't, the broker/exchange id is wrong —
   correct `BROKER_EXCHANGE_MAP` and re-fetch.
3. **The temporal gate stays in force** — the re-fetch pulls the CURRENT data
   (which includes bars past the operator's run-day by definition). The runners
   lock the run-anchor first and `gateBars` drops everything past it; the
   pipeline never reads the post-anchor bars. The re-fetch does NOT change the
   temporal discipline — it only fixes WHICH broker the candles come from.

---

## 5. THE AUDIT TRAIL

Every future measurement MUST record the data source it ran on:

- the fixture SHA256 (computed at fetch time),
- the fetch timestamp (ISO),
- the broker per pair (from §1),
- the run-anchor used (the `--day`/`--time` temporal lock).

A measurement that cannot state these four facts is not an auditable
measurement. The provenance record lives HERE — this document is append-only
for every re-fetch: new entry with the new date, the new spans, the new SHA, the
new verdict. Never overwrite an audit entry.
