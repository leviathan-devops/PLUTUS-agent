/**
 * OBCVEngine — the order-block vision engine (spec B.W2.5).
 *
 * INPUT: OHLCBar[] (from the MarketDataAdapter). OUTPUT: ZoneModel[] with
 * OBCV evidence (bw, bf, prior, originIdx, formationMs).
 *
 * THE MECHANISM (computed from the data — the hardcode ban):
 * 1. Slide a consolidation window of WINDOW_BARS candles. A window qualifies
 *    when its mean body-in-pips (bw) and mean body-fraction (bf) pass the
 *    ZERO-TOLERANCE gates (bw >= 3.0, bf >= 0.65 — strict < rejects).
 * 2. The breakout candle after the window must close beyond the window
 *    extreme in one direction: close above max-H -> the range is DEMAND
 *    (price left upward from it); close below min-L -> SUPPLY.
 * 3. prior-move classifier over the PRE_BARS before the window: net drift in
 *    pips below DRIFT_PIPS -> NONE; same sign as the breakout -> SAME;
 *    opposite -> OPPOSITE.
 * 4. The death-scope law: tf === '4H' -> 'BoM', every other tf -> 'MoM'
 *    (30m MoM-only; BoM origins are 4H-only per B.W2.5).
 *    SEAM REPORT: B.W5 L1 admits 4H/1H BoM origins — this engine follows
 *    B.W2.5 (4H-only); the orchestrator owns the ruling.
 * 5. zfp is the bf conviction scaled into [0.05, 0.95] (a v1 proxy, stated
 *    not hidden); reactionCount starts 0, pressure VIRGIN.
 *
 * atr14 is computed from the bars (mean true range over the trailing 14)
 * unless the caller supplies it; pip defaults from the pair lineage
 * (DXY 0.01, else 0.0001 — src/e1/core/types.ts line 89).
 */

import type { OHLCBar, PairKey, TimeframeKey, ZoneModel } from "../core/types.ts"

export const OBCV_BW_GATE = 3.0
export const OBCV_BF_GATE = 0.65
const WINDOW_BARS = 5
const PRE_BARS = 5
const DRIFT_PIPS = 3.0

export interface OBCVInput {
  bars: OHLCBar[]
  pair: PairKey
  tf: TimeframeKey
  pip?: number
  atr14?: number
}

/** Strict ZERO-TOLERANCE gates: bw >= 3.0 AND bf >= 0.65 (equality passes). */
export function passesObcvGates(bw: number, bf: number): boolean {
  return bw >= OBCV_BW_GATE && bf >= OBCV_BF_GATE
}

export function pipFor(pair: PairKey): number {
  return pair === "DXY" ? 0.01 : 0.0001
}

export function atr14Of(bars: OHLCBar[]): number {
  if (bars.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]!
    const p = bars[i - 1]!
    trs.push(Math.max(b.H - b.L, Math.abs(b.H - p.C), Math.abs(b.L - p.C)))
  }
  const window = trs.slice(-14)
  return window.reduce((a, x) => a + x, 0) / window.length
}

function meanBodyPips(window: OHLCBar[], pip: number): number {
  return window.reduce((a, b) => a + Math.abs(b.C - b.O) / pip, 0) / window.length
}

function meanBodyFraction(window: OHLCBar[]): number {
  return (
    window.reduce((a, b) => {
      const range = b.H - b.L
      return a + (range <= 0 ? 0 : Math.abs(b.C - b.O) / range)
    }, 0) / window.length
  )
}

export class OBCVEngine {
  detect(input: OBCVInput): ZoneModel[] {
    const { bars, pair, tf } = input
    if (bars.length < WINDOW_BARS + 1) return []
    const pip = input.pip ?? pipFor(pair)
    if (!(pip > 0)) return []
    void input.atr14
    const zones: ZoneModel[] = []
    let i = 0
    while (i + WINDOW_BARS < bars.length) {
      const window = bars.slice(i, i + WINDOW_BARS)
      const bw = meanBodyPips(window, pip)
      const bf = meanBodyFraction(window)
      const out = bars[i + WINDOW_BARS]!
      if (!passesObcvGates(bw, bf)) {
        i += 1
        continue
      }
      const hi = Math.max(...window.map((b) => b.H))
      const lo = Math.min(...window.map((b) => b.L))
      if (!(hi > lo)) {
        i += 1
        continue
      }
      const up = out.C > hi
      const down = out.C < lo
      if (!up && !down) {
        i += 1
        continue
      }
      const pre = bars.slice(Math.max(0, i - PRE_BARS), i)
      const driftPips = pre.length > 0 ? (pre[pre.length - 1]!.C - pre[0]!.O) / pip : 0
      const dir = up ? 1 : -1
      const prior =
        Math.abs(driftPips) < DRIFT_PIPS ? ("NONE" as const) : Math.sign(driftPips) === dir ? ("SAME" as const) : ("OPPOSITE" as const)
      const top = hi
      const bottom = lo
      const formationMs = window[0]!.t
      const zfp = Math.min(0.95, Math.max(0.05, bf))
      zones.push({
        id: `${pair}|${tf}|${formationMs}|${top.toFixed(5)}`,
        type: up ? "DEMAND" : "SUPPLY",
        top,
        bottom,
        classification: tf === "4H" ? "BoM" : "MoM",
        formationMs,
        originIdx: i,
        bw,
        bf,
        prior,
        tf,
        source: "OBCV",
        zfp,
        pressure: "VIRGIN",
        reactionCount: 0,
      })
      i += WINDOW_BARS + 1
    }
    return zones
  }
}
