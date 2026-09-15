/**
 * MarketDataAdapter tests — the anchorMs gate throws LOUD (never filters),
 * malformed records name their field, absence stays valid.
 */

import { describe, expect, test } from "bun:test"
import { decodeMarketData, MarketDataDecodeError } from "./market-data-adapter.ts"
import { FutureBarLeak } from "../../runtime/errors.ts"

const A = 1783076400000

function bar(t: number, o = 1.1, h = 1.1005, l = 1.0995, c = 1.1002) {
  return { t, O: o, H: h, L: l, C: c }
}

describe("MarketDataAdapter", () => {
  test("FUTURE_BAR_LEAK: a mutant bar past anchorMs throws the TYPED error", () => {
    const raw = [bar(A - 2), bar(A - 1), bar(A + 60_000)]
    let caught: unknown = null
    try {
      decodeMarketData(raw, A)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(FutureBarLeak)
    expect((caught as FutureBarLeak)._tag).toBe("FUTURE_BAR_LEAK")
    expect((caught as Error).message).toContain("FUTURE_BAR_LEAK")
  })

  test("clean pre-anchor bars decode through untouched", () => {
    const out = decodeMarketData([bar(A - 2), bar(A - 1), bar(A)], A)
    expect(out.length).toBe(3)
    expect(out.map((b) => b.t)).toEqual([A - 2, A - 1, A])
  })

  test("boundary: bar t === anchorMs passes (only strictly-future leaks)", () => {
    expect(() => decodeMarketData([bar(A)], A)).not.toThrow()
  })

  test("malformed record names the field — missing C", () => {
    let caught: unknown = null
    try {
      decodeMarketData([{ t: A - 1, O: 1.1, H: 1.1005, L: 1.0995 }], A)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(MarketDataDecodeError)
    expect((caught as MarketDataDecodeError).field).toBe("C")
  })

  test("non-numeric t names the field t", () => {
    let caught: unknown = null
    try {
      decodeMarketData([{ t: "yesterday", O: 1.1, H: 1.1005, L: 1.0995, C: 1.1002 }], A)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(MarketDataDecodeError)
    expect((caught as MarketDataDecodeError).field).toBe("t")
  })

  test("inverted H/L range is refused with the range named", () => {
    expect(() => decodeMarketData([bar(A - 1, 1.1, 1.09, 1.11, 1.1)], A)).toThrow(/H\/L/)
  })

  test("empty array decodes to [] — absence is valid, not error", () => {
    expect(decodeMarketData([], A)).toEqual([])
  })

  test("null input throws (decode fails loud, never returns [zero-bar])", () => {
    expect(() => decodeMarketData(null, A)).toThrow(MarketDataDecodeError)
  })

  test("TV-style keys (time/open/high/low/close) decode identically", () => {
    const out = decodeMarketData(
      [{ time: A - 1, open: 1.1, high: 1.1005, low: 1.0995, close: 1.1002 }],
      A,
    )
    expect(out).toEqual([{ t: A - 1, O: 1.1, H: 1.1005, L: 1.0995, C: 1.1002 }])
  })
})
