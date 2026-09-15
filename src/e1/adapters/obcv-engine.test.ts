/**
 * OBCVEngine tests — gates reject weak structure (ZERO TOLERANCE), tf laws
 * hold (4H BoM / 30m MoM-only), the prior classifier reaches all three
 * branches, anchors land on the origin bar.
 */

import { describe, expect, test } from "bun:test"
import { OBCVEngine, atr14Of, passesObcvGates, pipFor } from "./obcv-engine.ts"
import type { OHLCBar } from "../core/types.ts"

const T0 = 1783076400000
const M = 60_000
const PIP = 0.0001

/** A strong-body candle: 5-pip body, 7-pip range (bf ~= 0.71). */
function strong(t: number, o: number, dir: 1 | -1): OHLCBar {
  const c = o + dir * 5 * PIP
  const hi = Math.max(o, c) + PIP
  const lo = Math.min(o, c) - PIP
  return { t, O: o, H: hi, L: lo, C: c }
}

/** A doji: 0.5-pip body (bw gate must kill it). */
function doji(t: number, p: number): OHLCBar {
  return { t, O: p, H: p + 2 * PIP, L: p - 2 * PIP, C: p + 0.5 * PIP }
}

/** A long-wick candle: 5-pip body, 25-pip range (bf ~= 0.2, must die). */
function wicky(t: number, o: number, dir: 1 | -1): OHLCBar {
  const c = o + dir * 5 * PIP
  return { t, O: o, H: Math.max(o, c) + 10 * PIP, L: Math.min(o, c) - 10 * PIP, C: c }
}

/** 5-bar ascending consolidation starting at price p, then an UP breakout. */
function upFixture(pre: OHLCBar[] = []): OHLCBar[] {
  const bars = [...pre]
  let p = 1.1
  for (let i = 0; i < 5; i++) {
    bars.push(strong(T0 + (pre.length + i) * M, p, 1))
    p += 5 * PIP
  }
  const hi = Math.max(...bars.slice(-5).map((b) => b.H))
  bars.push({ t: T0 + (pre.length + 5) * M, O: hi - PIP, H: hi + 6 * PIP, L: hi - 2 * PIP, C: hi + 5 * PIP })
  return bars
}

const engine = new OBCVEngine()

describe("OBCVEngine", () => {
  test("strong consolidation + breakout on 4H -> BoM DEMAND zone", () => {
    const zones = engine.detect({ bars: upFixture(), pair: "EUR/USD", tf: "4H" })
    expect(zones.length).toBe(1)
    const z = zones[0]!
    expect(z.type).toBe("DEMAND")
    expect(z.classification).toBe("BoM")
    expect(z.bw).toBeGreaterThanOrEqual(3.0)
    expect(z.bf).toBeGreaterThanOrEqual(0.65)
    expect(z.formationMs).toBe(T0)
    expect(z.originIdx).toBe(0)
    expect(z.top).toBeGreaterThan(z.bottom)
    expect(z.pressure).toBe("VIRGIN")
    expect(z.reactionCount).toBe(0)
  })

  test("same structure on 30m -> MoM, NEVER BoM (the 30m MoM-only law)", () => {
    const zones = engine.detect({ bars: upFixture(), pair: "EUR/USD", tf: "30m" })
    expect(zones.length).toBe(1)
    expect(zones[0]!.classification).toBe("MoM")
  })

  test("doji consolidation -> [] (the bw gate kills weak bodies)", () => {
    const bars: OHLCBar[] = []
    for (let i = 0; i < 5; i++) bars.push(doji(T0 + i * M, 1.1))
    bars.push({ t: T0 + 5 * M, O: 1.1, H: 1.11, L: 1.09, C: 1.109 })
    expect(engine.detect({ bars, pair: "EUR/USD", tf: "4H" })).toEqual([])
  })

  test("long-wick consolidation -> [] (the bf gate kills weak conviction)", () => {
    const bars: OHLCBar[] = []
    let p = 1.1
    for (let i = 0; i < 5; i++) {
      bars.push(wicky(T0 + i * M, p, 1))
      p += 5 * PIP
    }
    const hi = Math.max(...bars.map((b) => b.H))
    bars.push({ t: T0 + 5 * M, O: hi - PIP, H: hi + PIP, L: hi - 2 * PIP, C: hi + 0.5 * PIP })
    expect(engine.detect({ bars, pair: "EUR/USD", tf: "4H" })).toEqual([])
  })

  test("prior NONE: flat pre-bars -> prior NONE", () => {
    const pre: OHLCBar[] = []
    for (let i = 0; i < 5; i++) pre.push(doji(T0 - (5 - i) * M, 1.1))
    const zones = engine.detect({ bars: upFixture(pre), pair: "EUR/USD", tf: "4H" })
    expect(zones.length).toBe(1)
    expect(zones[0]!.prior).toBe("NONE")
  })

  test("prior SAME: rising pre-bars before an up-breakout -> SAME", () => {
    // Pre-bars are long-wick (bf ~= 0.2): they carry drift but can NEVER
    // qualify as a zone themselves, so zones[0] is the fixture window.
    const pre: OHLCBar[] = []
    let p = 1.09
    for (let i = 0; i < 5; i++) {
      pre.push(wicky(T0 - (5 - i) * M, p, 1))
      p += 8 * PIP
    }
    const zones = engine.detect({ bars: upFixture(pre), pair: "EUR/USD", tf: "4H" })
    expect(zones.length).toBe(1)
    expect(zones[0]!.prior).toBe("SAME")
  })

  test("prior OPPOSITE: falling pre-bars before an up-breakout -> OPPOSITE", () => {
    const pre: OHLCBar[] = []
    let p = 1.11
    for (let i = 0; i < 5; i++) {
      pre.push(wicky(T0 - (5 - i) * M, p, -1))
      p -= 8 * PIP
    }
    const zones = engine.detect({ bars: upFixture(pre), pair: "EUR/USD", tf: "4H" })
    expect(zones.length).toBe(1)
    expect(zones[0]!.prior).toBe("OPPOSITE")
  })

  test("gate boundaries: 3.0/0.65 pass, 2.999/0.649 reject (ZERO TOLERANCE)", () => {
    expect(passesObcvGates(3.0, 0.65)).toBe(true)
    expect(passesObcvGates(2.999, 0.65)).toBe(false)
    expect(passesObcvGates(3.0, 0.649)).toBe(false)
    expect(passesObcvGates(0, 0)).toBe(false)
  })

  test("empty bars -> []; single bar -> [] (no window, no zone)", () => {
    expect(engine.detect({ bars: [], pair: "EUR/USD", tf: "4H" })).toEqual([])
    expect(engine.detect({ bars: [strong(T0, 1.1, 1)], pair: "EUR/USD", tf: "4H" })).toEqual([])
  })

  test("pip lineage: DXY 0.01, EU 0.0001; atr14 computed from data", () => {
    expect(pipFor("DXY")).toBe(0.01)
    expect(pipFor("EUR/USD")).toBe(0.0001)
    const bars = upFixture()
    expect(atr14Of(bars)).toBeGreaterThan(0)
    expect(atr14Of([])).toBe(0)
  })
})
