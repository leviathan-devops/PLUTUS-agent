/**
 * Journal tests — chain integrity is the kernel's ground truth.
 * Adversarial: tamper, truncation-by-payload-edit, empty causationId,
 * empty query, concurrent appends, unknown-seq corrupt (no-op, chain holds).
 */

import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Journal, JournalMemoryLive } from "./journal.ts"

const TestLayer = JournalMemoryLive

const run = <A, E>(program: Effect.Effect<A, E, Journal>): Promise<A> =>
  Effect.runPromise(program.pipe(Effect.provide(TestLayer)) as Effect.Effect<A, E>)

describe("Journal", () => {
  test("append 3 entries under one causationId — query returns all in seq order", async () => {
    const rows = await run(
      Effect.gen(function*() {
        const j = yield* Journal
        yield* j.append({ causationId: "run-1", kind: "activity.start", payload: { n: 1 } })
        yield* j.append({ causationId: "run-1", kind: "activity.done", payload: { n: 2 } })
        yield* j.append({ causationId: "run-1", kind: "activity.done", payload: { n: 3 } })
        return yield* j.query("run-1")
      })
    )
    expect(rows.length).toBe(3)
    expect(rows.map((r) => r.seq)).toEqual([0, 1, 2])
    expect(rows[0]?.prevHash).toBe("GENESIS")
    expect(rows[1]?.prevHash).toBe(rows[0]?.entryHash)
    expect(rows[2]?.prevHash).toBe(rows[1]?.entryHash)
  })

  test("integrity check passes on a clean chain", async () => {
    await run(
      Effect.gen(function*() {
        const j = yield* Journal
        yield* j.append({ causationId: "clean", kind: "k", payload: { a: 1 } })
        yield* j.append({ causationId: "clean", kind: "k", payload: { a: 2 } })
        yield* j.checkIntegrity()
      })
    )
  })

  test("tampered payload → JOURNAL_CORRUPT naming seq 1", async () => {
    // Tamper simulation: overwrite row 1's payload bytes, chain must break loud.
    const caught = await run(
      Effect.gen(function*() {
        const j = yield* Journal
        yield* j.append({ causationId: "t2", kind: "k", payload: { v: 1 } })
        yield* j.append({ causationId: "t2", kind: "k", payload: { v: 2 } })
        yield* j.corruptForTest(1, { payload: JSON.stringify({ v: "FORGED" }) })
        return yield* j.checkIntegrity().pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("JOURNAL_CORRUPT")
    expect(caught.seq).toBe(1)
  })

  test("tampered prevHash → JOURNAL_CORRUPT", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const j = yield* Journal
        yield* j.append({ causationId: "p", kind: "k", payload: 1 })
        yield* j.append({ causationId: "p", kind: "k", payload: 2 })
        yield* j.corruptForTest(1, { prevHash: "ATTACKER" })
        return yield* j.checkIntegrity().pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("JOURNAL_CORRUPT")
    expect(caught.seq).toBe(1)
  })

  test("query unknown causationId → empty array (not an error)", async () => {
    const rows = await run(
      Effect.gen(function*() {
        const j = yield* Journal
        yield* j.append({ causationId: "exists", kind: "k", payload: 1 })
        return yield* j.query("does-not-exist")
      })
    )
    expect(rows).toEqual([])
  })

  test("empty causationId append → JOURNAL_CORRUPT (refused, not stored)", async () => {
    const [caught, all] = await run(
      Effect.gen(function*() {
        const j = yield* Journal
        const caught = yield* j.append({ causationId: "", kind: "k", payload: 1 }).pipe(Effect.flip)
        const all = yield* j.all()
        return [caught, all] as const
      })
    )
    expect(caught._tag).toBe("JOURNAL_CORRUPT")
    expect(all.length).toBe(0)
  })

  test("empty kind append → JOURNAL_CORRUPT (refused, not stored)", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const j = yield* Journal
        return yield* j.append({ causationId: "c", kind: "", payload: 1 }).pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("JOURNAL_CORRUPT")
  })

  test("20 concurrent appends — all 20 rows, seqs 0..19 unique, chain holds", async () => {
    const rows = await run(
      Effect.gen(function*() {
        const j = yield* Journal
        yield* Effect.forEach(
          Array.from({ length: 20 }, (_, i) => i),
          (i) => j.append({ causationId: "burst", kind: "k", payload: { i } }),
          { concurrency: 10 }
        )
        yield* j.checkIntegrity()
        return yield* j.all()
      })
    )
    expect(rows.length).toBe(20)
    expect(new Set(rows.map((r) => r.seq)).size).toBe(20)
  })

  test("corruptForTest on unknown seq — no-op, chain still holds", async () => {
    await run(
      Effect.gen(function*() {
        const j = yield* Journal
        yield* j.append({ causationId: "s", kind: "k", payload: 1 })
        yield* j.corruptForTest(99, { payload: "ghost" })
        yield* j.checkIntegrity()
        const all = yield* j.all()
        if (all.length !== 1) throw new Error("unexpected row count")
      })
    )
  })

  test("null payload stored as null JSON, chain holds", async () => {
    const rows = await run(
      Effect.gen(function*() {
        const j = yield* Journal
        yield* j.append({ causationId: "n", kind: "k", payload: null })
        yield* j.append({ causationId: "n", kind: "k", payload: undefined })
        yield* j.checkIntegrity()
        return yield* j.query("n")
      })
    )
    expect(rows.length).toBe(2)
    expect(rows[0]?.payload).toBe("null")
  })
})
