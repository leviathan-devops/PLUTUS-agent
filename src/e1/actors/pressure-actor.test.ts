/**
 * pressureActor tests — the SWEEP-counting guard, the 4H-never-death guard,
 * the fortress paths, the BROKEN path (all through the REAL actor).
 */

import { describe, expect, test } from "bun:test"
import { createPressureActor } from "./pressure-actor.ts"
import type { TimeframeKey, TouchKind } from "../core/types.ts"

function sweep(atMs: number) {
  return { type: "BATTLE_RESOLVED" as const, touchKind: "SWEEP" as TouchKind, atMs }
}
function touch(kind: TouchKind, atMs: number) {
  return { type: "BATTLE_RESOLVED" as const, touchKind: kind, atMs }
}

function run(tf: TimeframeKey | undefined, events: { type: "BATTLE_RESOLVED"; touchKind: TouchKind; atMs: number }[]) {
  const a = createPressureActor("z1", tf)
  a.start()
  try {
    for (const e of events) a.send(e)
    const snap = a.getSnapshot()
    return { value: snap.value as string, ctx: snap.context }
  } finally {
    a.stop()
  }
}

const T = (n: number) => 1783076400000 + n * 60_000

describe("pressureActor", () => {
  test("VIRGIN + SWEEP -> ACTIVE_1, reactionCount 1", () => {
    const r = run("1H", [sweep(T(1))])
    expect(r.value).toBe("ACTIVE_1")
    expect(r.ctx.state).toBe("ACTIVE-1")
    expect(r.ctx.reactionCount).toBe(1)
    expect(r.ctx.eatenAtMs).toBe(T(1))
  })

  test("3 sweeps on 1H -> DEPLETED (the death rule fires at exactly 3)", () => {
    const r = run("1H", [sweep(T(1)), sweep(T(2)), sweep(T(3))])
    expect(r.value).toBe("DEPLETED")
    expect(r.ctx.reactionCount).toBe(3)
    expect(r.ctx.state).toBe("DEPLETED")
  })

  test("2 sweeps hold ACTIVE_2 — the boundary below death", () => {
    const r = run("1H", [sweep(T(1)), sweep(T(2))])
    expect(r.value).toBe("ACTIVE_2")
    expect(r.ctx.state).toBe("ACTIVE-2")
    expect(r.ctx.reactionCount).toBe(2)
  })

  test("touches never advance the count — 3 wick-rejects stay VIRGIN", () => {
    const r = run("1H", [touch("WICK_REJECT", T(1)), touch("BODY_DEFEND", T(2)), touch("CONSOL_DWELL", T(3))])
    expect(r.value).toBe("VIRGIN")
    expect(r.ctx.reactionCount).toBe(0)
    expect(r.ctx.defenseCount).toBe(3)
  })

  test("4H guard: 3 sweeps on 4H REFUSE death — ACTIVE_2 with count 3", () => {
    const r = run("4H", [sweep(T(1)), sweep(T(2)), sweep(T(3))])
    expect(r.value).toBe("ACTIVE_2")
    expect(r.ctx.reactionCount).toBe(3)
    expect(r.ctx.state).toBe("ACTIVE-2")
  })

  test("4 defenses with zero sweeps -> FORTRESS", () => {
    const r = run("30m", [
      touch("BODY_DEFEND", T(1)),
      touch("WICK_REJECT", T(2)),
      touch("BODY_DEFEND", T(3)),
      touch("WICK_REJECT", T(4)),
    ])
    expect(r.value).toBe("FORTRESS")
  })

  test("FORTRESS records a later defense as defenseCount, not a sweep", () => {
    const r = run("30m", [
      touch("BODY_DEFEND", T(1)),
      touch("WICK_REJECT", T(2)),
      touch("BODY_DEFEND", T(3)),
      touch("WICK_REJECT", T(4)),
      touch("BODY_DEFEND", T(5)),
    ])
    expect(r.value).toBe("FORTRESS")
    expect(r.ctx.defenseCount).toBe(5)
    expect(r.ctx.reactionCount).toBe(0)
  })

  test("PASS_THROUGH from VIRGIN -> BROKEN", () => {
    const r = run("1H", [touch("PASS_THROUGH", T(1))])
    expect(r.value).toBe("BROKEN")
  })

  test("fortress override: defense after sweeps turns the 3rd sweep to FORTRESS", () => {
    const r = run("1H", [sweep(T(1)), sweep(T(2)), touch("BODY_DEFEND", T(3)), sweep(T(4))])
    expect(r.value).toBe("FORTRESS")
    expect(r.ctx.reactionCount).toBe(3)
  })

  test("ZFP_MEASURED records lastZfp without moving state", () => {
    const a = createPressureActor("z1", "1H")
    a.start()
    try {
      a.send(sweep(T(1)))
      a.send({ type: "ZFP_MEASURED", value: 0.62 })
      const snap = a.getSnapshot()
      expect(snap.value).toBe("ACTIVE_1")
      expect(snap.context.lastZfp).toBe(0.62)
    } finally {
      a.stop()
    }
  })

  test("malformed battle (bad touchKind) is ignored — actor alive, count 0", () => {
    const a = createPressureActor("z1", "1H")
    a.start()
    try {
      a.send({ type: "BATTLE_RESOLVED", touchKind: "NOPE", atMs: T(1) } as unknown as Parameters<typeof a.send>[0])
      const snap = a.getSnapshot()
      expect(snap.value).toBe("VIRGIN")
      expect(snap.context.reactionCount).toBe(0)
    } finally {
      a.stop()
    }
  })
})
