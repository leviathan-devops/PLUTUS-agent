/**
 * e1Container tests — the grouping holds refs, memoises per-zone actors,
 * and owns NO runtime (container IS data).
 */

import { describe, expect, test } from "bun:test"
import { LexiconRegistry } from "../core/engine.ts"
import { actorForZone, createE1Container } from "./container.ts"
import { OBCVEngine } from "../adapters/obcv-engine.ts"

describe("e1Container", () => {
  test("create groups zoneMap + empty pressure map + engines", () => {
    const c = createE1Container({ lmEngine: new LexiconRegistry(), obcvEngine: new OBCVEngine() })
    expect(c.zoneMapActor).toBeDefined()
    expect(c.pressureActors.size).toBe(0)
    expect(c.lmEngine).toBeInstanceOf(LexiconRegistry)
    expect(c.obcvEngine).toBeInstanceOf(OBCVEngine)
  })

  test("actorForZone memoises — same zone returns the SAME actor", () => {
    const c = createE1Container()
    const a1 = actorForZone(c, "z1", "1H")
    const a2 = actorForZone(c, "z1", "1H")
    expect(a1).toBe(a2)
    expect(c.pressureActors.size).toBe(1)
  })

  test("different zones get different actors", () => {
    const c = createE1Container()
    expect(actorForZone(c, "z1")).not.toBe(actorForZone(c, "z2"))
    expect(c.pressureActors.size).toBe(2)
  })

  test("container IS data — no runtime methods of its own", () => {
    const c = createE1Container()
    for (const k of ["start", "stop", "tick", "run", "send"] as const) {
      expect((c as unknown as Record<string, unknown>)[k]).toBeUndefined()
    }
    expect(Object.keys(c).sort()).toEqual(["lmEngine", "obcvEngine", "pressureActors", "zoneMapActor"])
  })
})
