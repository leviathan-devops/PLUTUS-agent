/**
 * zoneMapActor tests — transitions, guards, snapshot (driven through the
 * REAL actor: createActor + start + send; a test that cannot fail is theater).
 */

import { describe, expect, test } from "bun:test"
import {
  createZoneMapActor,
  readZoneMapSnapshot,
  type LexiconVerdict,
} from "./zone-map-actor.ts"
import type { ZoneModel } from "../core/types.ts"

function zone(id: string, overrides?: Partial<ZoneModel>): ZoneModel {
  return {
    id,
    type: "SUPPLY",
    top: 1.14571,
    bottom: 1.1446,
    classification: "MoM",
    formationMs: 1783076400000,
    originIdx: 10,
    bw: 3.5,
    bf: 0.7,
    prior: "NONE",
    tf: "1H",
    zfp: 0.5,
    ...overrides,
  }
}

const verdict = (pattern: string): LexiconVerdict => ({
  pattern,
  state: "CLASSIFIED",
  evidence: { file: "src/e1/machines/zone-classification.ts", line: 42, quote: "operator verbatim" },
})

describe("zoneMapActor", () => {
  test("empty + ZONE_ADDED -> populating with the zone in snapshot", () => {
    const a = createZoneMapActor()
    a.start()
    try {
      expect(a.getSnapshot().value).toBe("empty")
      a.send({ type: "ZONE_ADDED", zone: zone("z1") })
      expect(a.getSnapshot().value).toBe("populating")
      expect(readZoneMapSnapshot(a).zones.map((z) => z.id)).toEqual(["z1"])
    } finally {
      a.stop()
    }
  })

  test("ZONE_UPDATED replaces the zone; PRESSURE_CHANGED touches pressure only", () => {
    const a = createZoneMapActor()
    a.start()
    try {
      a.send({ type: "ZONE_ADDED", zone: zone("z1") })
      a.send({ type: "ZONE_UPDATED", zone: zone("z1", { top: 9.99 }) })
      expect(readZoneMapSnapshot(a).zones[0]!.top).toBe(9.99)
      a.send({ type: "PRESSURE_CHANGED", zoneId: "z1", pressure: "ACTIVE-1" })
      const snap = readZoneMapSnapshot(a)
      expect(snap.zones[0]!.pressure).toBe("ACTIVE-1")
      expect(snap.zones[0]!.top).toBe(9.99)
    } finally {
      a.stop()
    }
  })

  test("VERDICT_RECORDED accumulates; FINALIZE -> finalized with full snapshot", () => {
    const a = createZoneMapActor()
    a.start()
    try {
      a.send({ type: "ZONE_ADDED", zone: zone("z1") })
      a.send({ type: "VERDICT_RECORDED", verdict: verdict("zone-classification:MoM") })
      a.send({ type: "FINALIZE" })
      const snap = a.getSnapshot()
      expect(snap.status).toBe("done")
      const out = snap.output as ReturnType<typeof readZoneMapSnapshot>
      expect(out.zones.length).toBe(1)
      expect(out.verdicts.map((v) => v.pattern)).toEqual(["zone-classification:MoM"])
    } finally {
      a.stop()
    }
  })

  test("FINALIZE from empty is refused — the skeleton holds, no phantom final", () => {
    const a = createZoneMapActor()
    a.start()
    try {
      a.send({ type: "FINALIZE" })
      expect(a.getSnapshot().value).toBe("empty")
      expect(a.getSnapshot().status).not.toBe("done")
    } finally {
      a.stop()
    }
  })

  test("duplicate ZONE_ADDED upserts — no forked entries", () => {
    const a = createZoneMapActor()
    a.start()
    try {
      a.send({ type: "ZONE_ADDED", zone: zone("z1") })
      a.send({ type: "ZONE_ADDED", zone: zone("z1", { bottom: 1.0 }) })
      const snap = readZoneMapSnapshot(a)
      expect(snap.zones.length).toBe(1)
      expect(snap.zones[0]!.bottom).toBe(1.0)
    } finally {
      a.stop()
    }
  })

  test("malformed ZONE_ADDED is refused — map uncorrupted, actor alive", () => {
    const a = createZoneMapActor()
    a.start()
    try {
      a.send({ type: "ZONE_ADDED", zone: undefined as unknown as ZoneModel })
      expect(a.getSnapshot().value).toBe("empty")
      a.send({ type: "ZONE_ADDED", zone: zone("z1") })
      expect(readZoneMapSnapshot(a).zones.length).toBe(1)
    } finally {
      a.stop()
    }
  })

  test("PRESSURE_CHANGED for unknown zone id is a no-op, never a crash", () => {
    const a = createZoneMapActor()
    a.start()
    try {
      a.send({ type: "ZONE_ADDED", zone: zone("z1") })
      a.send({ type: "PRESSURE_CHANGED", zoneId: "ghost", pressure: "BROKEN" })
      const snap = readZoneMapSnapshot(a)
      expect(snap.zones.length).toBe(1)
      expect(snap.zones[0]!.pressure).toBeUndefined()
    } finally {
      a.stop()
    }
  })

  test("rapid sequence of adds all land before FINALIZE", () => {
    const a = createZoneMapActor()
    a.start()
    try {
      for (let i = 0; i < 20; i++) a.send({ type: "ZONE_ADDED", zone: zone(`z${i}`) })
      a.send({ type: "FINALIZE" })
      expect((a.getSnapshot().output as { zones: unknown[] }).zones.length).toBe(20)
    } finally {
      a.stop()
    }
  })
})
