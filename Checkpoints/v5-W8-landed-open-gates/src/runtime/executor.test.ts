/**
 * Executor tests — fan-out, isolation, Activity journaling, loud failures.
 * Adversarial: unknown kind, failing sibling isolation, empty batch,
 * empty task id, duplicate registry kind, 5-node concurrency completion.
 */

import { describe, expect, test } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { CardInvalid } from "./errors.ts"
import { Executor, ExecutorLive, KERNEL_CONCURRENCY } from "./executor.ts"
import { Journal, JournalMemoryLive } from "./journal.ts"
import { NodeRegistry, NodeRegistryLive } from "./node-registry.ts"

// v4-beta rule: ExecutorLive's (Journal + NodeRegistry) requirements must be
// saturated via Layer.provide BEFORE merging (bare mergeAll leaves them unmet).
const TestBase = Layer.mergeAll(JournalMemoryLive, NodeRegistryLive)
const TestDeps = Layer.mergeAll(
  TestBase,
  ExecutorLive.pipe(Layer.provide(TestBase)) as Layer.Layer<Executor>
)

const run = <A, E>(program: Effect.Effect<A, E, Journal | NodeRegistry | Executor>): Promise<A> =>
  Effect.runPromise(program.pipe(Effect.provide(TestDeps)) as Effect.Effect<A, E>)

const echoImpl = (kind: string, family: "execution" = "execution") => ({
  kind,
  family,
  requires: [] as ReadonlyArray<string>,
  invoke: (input: unknown) => Effect.succeed(`echo:${kind}:${String(input)}`)
})

describe("Executor", () => {
  test("KERNEL_CONCURRENCY is 15 (spec D.4)", () => {
    expect(KERNEL_CONCURRENCY).toBe(15)
  })

  test("5 fake nodes at concurrency 15 — all complete with values", async () => {
    const outcomes = await run(
      Effect.gen(function*() {
        const registry = yield* NodeRegistry
        const executor = yield* Executor
        for (let i = 0; i < 5; i++) yield* registry.register(echoImpl(`fake-${i}`))
        return yield* executor.runBatch(
          Array.from({ length: 5 }, (_, i) => ({
            id: `n${i}`,
            kind: `fake-${i}`,
            input: `in-${i}`,
            causationId: "batch-1"
          }))
        )
      })
    )
    expect(outcomes.length).toBe(5)
    for (let i = 0; i < 5; i++) {
      const o = outcomes[i] as { id: string; exit: Exit.Exit<unknown, CardInvalid> }
      expect(o.id).toBe(`n${i}`)
      expect(Exit.isSuccess(o.exit)).toBe(true)
      if (Exit.isSuccess(o.exit)) expect(o.exit.value).toBe(`echo:fake-${i}:in-${i}`)
    }
  })

  test("one failing sibling does not kill the batch — per-node Exits", async () => {
    const outcomes = await run(
      Effect.gen(function*() {
        const registry = yield* NodeRegistry
        const executor = yield* Executor
        yield* registry.register(echoImpl("good-a"))
        yield* registry.register(echoImpl("good-b"))
        yield* registry.register({
          kind: "bad",
          family: "execution",
          requires: [],
          invoke: (_input) => Effect.fail(new CardInvalid({ message: "boom" }))
        })
        return yield* executor.runBatch([
          { id: "g1", kind: "good-a", input: 1, causationId: "iso" },
          { id: "b1", kind: "bad", input: 2, causationId: "iso" },
          { id: "g2", kind: "good-b", input: 3, causationId: "iso" }
        ])
      })
    )
    expect(outcomes.length).toBe(3)
    const byId = new Map(outcomes.map((o) => [o.id, o.exit]))
    expect(Exit.isSuccess(byId.get("g1") as Exit.Exit<unknown, CardInvalid>)).toBe(true)
    expect(Exit.isSuccess(byId.get("g2") as Exit.Exit<unknown, CardInvalid>)).toBe(true)
    expect(Exit.isFailure(byId.get("b1") as Exit.Exit<unknown, CardInvalid>)).toBe(true)
  })

  test("unknown kind → CARD_INVALID via runOne", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const executor = yield* Executor
        return yield* executor
          .runOne({ id: "x", kind: "nope", input: 0, causationId: "u" })
          .pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
  })

  test("unknown kind in batch → failure Exit for that node only", async () => {
    const outcomes = await run(
      Effect.gen(function*() {
        const registry = yield* NodeRegistry
        const executor = yield* Executor
        yield* registry.register(echoImpl("only"))
        return yield* executor.runBatch([
          { id: "ok", kind: "only", input: 1, causationId: "m" },
          { id: "missing", kind: "ghost-kind", input: 2, causationId: "m" }
        ])
      })
    )
    expect(outcomes.length).toBe(2)
    expect(Exit.isSuccess(outcomes[0]?.exit as Exit.Exit<unknown, CardInvalid>)).toBe(true)
    expect(Exit.isFailure(outcomes[1]?.exit as Exit.Exit<unknown, CardInvalid>)).toBe(true)
  })

  test("empty batch → empty outcomes (not an error)", async () => {
    const outcomes = await run(
      Effect.gen(function*() {
        const executor = yield* Executor
        return yield* executor.runBatch([])
      })
    )
    expect(outcomes).toEqual([])
  })

  test("empty task id → CARD_INVALID", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const registry = yield* NodeRegistry
        const executor = yield* Executor
        yield* registry.register(echoImpl("e"))
        return yield* executor
          .runOne({ id: "", kind: "e", input: 0, causationId: "z" })
          .pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
  })

  test("duplicate registry kind → CARD_INVALID, original kept", async () => {
    const [caught, size] = await run(
      Effect.gen(function*() {
        const registry = yield* NodeRegistry
        yield* registry.register(echoImpl("dup"))
        const caught = yield* registry.register(echoImpl("dup")).pipe(Effect.flip)
        const size = yield* registry.size()
        return [caught, size] as const
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
    expect(size).toBe(1)
  })

  test("Activity journaling — start+done rows per node under the causationId", async () => {
    const rows = await run(
      Effect.gen(function*() {
        const registry = yield* NodeRegistry
        const executor = yield* Executor
        const journal = yield* Journal
        yield* registry.register(echoImpl("j1"))
        yield* registry.register({
          kind: "jfail",
          family: "execution",
          requires: [],
          invoke: (_i) => Effect.fail(new CardInvalid({ message: "jboom" }))
        })
        yield* executor.runBatch([
          { id: "a", kind: "j1", input: 1, causationId: "journal-check" },
          { id: "b", kind: "jfail", input: 2, causationId: "journal-check" }
        ])
        return yield* journal.query("journal-check")
      })
    )
    const kinds = rows.map((r) => r.kind).sort()
    expect(kinds).toEqual(["activity.done", "activity.fail", "activity.start", "activity.start"])
  })

  test("registry kinds() feeds the codec gate set", async () => {
    const kinds = await run(
      Effect.gen(function*() {
        const registry = yield* NodeRegistry
        yield* registry.register(echoImpl("k-a"))
        yield* registry.register(echoImpl("k-b"))
        return yield* registry.kinds()
      })
    )
    expect(kinds.has("k-a")).toBe(true)
    expect(kinds.has("k-b")).toBe(true)
  })
})
