/**
 * MarketDataAdapter — raw TV OHLC records -> OHLCBar[] (spec B.W2.5).
 *
 * The anchorMs temporal gate is a SCHEMA-gate, not a filter: ANY bar with
 * t > anchorMs throws the typed FUTURE_BAR_LEAK (imported from the runtime
 * desk's errors.ts — the no-future-leak law). A silent filter would let a
 * lookahead bug pass as clean data; the loud throw makes it a red build.
 *
 * Malformed records decode-fail with the FIELD NAMED (MarketDataDecodeError
 * carries field + index) — never a silent skip, never a zero-filled bar.
 */

import { FutureBarLeak } from "../../runtime/errors.ts"
import type { OHLCBar } from "../core/types.ts"

export class MarketDataDecodeError extends Error {
  readonly code = "MARKET_DATA_DECODE"
  readonly field: string
  readonly index: number

  constructor(field: string, index: number, detail: string) {
    super(`MARKET_DATA_DECODE record ${index} field "${field}": ${detail}`)
    this.name = "MarketDataDecodeError"
    this.field = field
    this.index = index
  }
}

type RawRecord = Record<string, unknown>

function numField(rec: RawRecord, keys: string[], index: number, canonical: string): number {
  for (const k of keys) {
    const v = rec[k]
    if (v === undefined) continue
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new MarketDataDecodeError(canonical, index, `key "${k}" is not a finite number (got ${String(v)})`)
    }
    return v
  }
  throw new MarketDataDecodeError(canonical, index, `missing (tried keys: ${keys.join(", ")})`)
}

function decodeRecord(rec: unknown, index: number): OHLCBar {
  if (typeof rec !== "object" || rec === null) {
    throw new MarketDataDecodeError("record", index, `not an object (got ${typeof rec})`)
  }
  const r = rec as RawRecord
  const t = numField(r, ["t", "time", "timestamp"], index, "t")
  const O = numField(r, ["O", "o", "open"], index, "O")
  const H = numField(r, ["H", "h", "high"], index, "H")
  const L = numField(r, ["L", "l", "low"], index, "L")
  const C = numField(r, ["C", "c", "close"], index, "C")
  if (H < L) {
    throw new MarketDataDecodeError("H/L", index, `high ${H} below low ${L} — inverted range`)
  }
  if (O < L || O > H || C < L || C > H) {
    throw new MarketDataDecodeError("O/C", index, `open ${O} / close ${C} outside [${L}, ${H}]`)
  }
  return { t, O, H, L, C }
}

/**
 * decodeMarketData — decode + anchor gate. THROWS FutureBarLeak on the FIRST
 * bar past anchorMs (fail-loud); THROWS MarketDataDecodeError on malformed
 * records. Empty input decodes to [] (no bars is valid absence, not error).
 */
export function decodeMarketData(raw: unknown, anchorMs: number): OHLCBar[] {
  if (typeof anchorMs !== "number" || !Number.isFinite(anchorMs)) {
    throw new MarketDataDecodeError("anchorMs", -1, `anchor is not a finite number (got ${String(anchorMs)})`)
  }
  if (!Array.isArray(raw)) {
    throw new MarketDataDecodeError("records", -1, `input is not an array (got ${typeof raw})`)
  }
  const bars = raw.map((rec, i) => decodeRecord(rec, i))
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!
    if (b.t > anchorMs) {
      throw new FutureBarLeak({
        message: `FUTURE_BAR_LEAK bar ${i} t=${b.t} past anchorMs=${anchorMs} — decode refused, never filtered`,
        barIndex: i,
        decisionIndex: bars.length > 0 ? bars.filter((x) => x.t <= anchorMs).length : 0,
      })
    }
  }
  return bars
}
