/**
 * Driver + codec + error-channel tests under TestLive.
 * Adversarial: schema rejects, unknown types, dangling edges, cycles, empty
 * nodes, host stubs fail loud, TestClock advances with no real time elapsed.
 */

import { describe, expect, test } from "bun:test"
import { Clock, Effect, Fiber, Option } from "effect"
import { TestClock } from "effect/testing"
import {
  AetherApiUnreachable,
  AetherDegrade,
  CardInvalid,
  CascadeDivergenceExceeded,
  ChartFail,
  DegenerateTpCap,
  DesignationIncomplete,
  E3DisobeyedE2,
  FrozenFileTouched,
  FutureBarLeak,
  JournalCorrupt,
  KERNEL_ERROR_TAGS,
  MirrorFloorContradicted,
  OracleIsolationViolated,
  RrrFloorViolation,
  SideInversionViolation
} from "./errors.ts"
import { Journal } from "./journal.ts"
import { NodeRegistry } from "./node-registry.ts"
import { Executor } from "./executor.ts"
import { WorkflowCodec } from "./workflow-codec.ts"
import {
  HooksBus,
  LlmClient,
  SubagentRunner,
  TestLive,
  ToolClient,
  ToolClientStubLive,
  SubagentStubLive,
  LlmStubLive,
  HooksBusStubLive,
  runTest
} from "./drivers.ts"

type TestEnv = Journal | WorkflowCodec | NodeRegistry | Executor | TestClock.TestClock

const run = <A, E>(program: Effect.Effect<A, E, TestEnv>): Promise<A> => runTest(program)

describe("WorkflowCodec", () => {
  test("decodes a valid doc", async () => {
    const doc = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        return yield* codec.decode({
          name: "hello",
          nodes: [{ id: "a", type: "gate" }],
          edges: []
        })
      })
    )
    expect(doc.name).toBe("hello")
  })

  test("non-object input → CARD_INVALID", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        return yield* codec.decode(42).pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
  })

  test("validate: unknown node type → CARD_INVALID", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        return yield* codec.validate(
          { name: "w", nodes: [{ id: "a", type: "nope" }] },
          new Set(["gate"])
        ).pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
    expect(caught.message).toContain("unknown node type")
  })

  test("validate: dangling edge → CARD_INVALID", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        return yield* codec.validate(
          { name: "w", nodes: [{ id: "a", type: "gate" }], edges: [{ from: "a", to: "ghost" }] },
          new Set(["gate"])
        ).pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
    expect(caught.message).toContain("dangling edge")
  })

  test("validate: cycle a→b→a → CARD_INVALID", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        return yield* codec.validate(
          {
            name: "w",
            nodes: [{ id: "a", type: "gate" }, { id: "b", type: "gate" }],
            edges: [{ from: "a", to: "b" }, { from: "b", to: "a" }]
          },
          new Set(["gate"])
        ).pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
    expect(caught.message).toContain("cycle")
  })

  test("validate: self-loop → CARD_INVALID", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        return yield* codec.validate(
          { name: "w", nodes: [{ id: "a", type: "gate" }], edges: [{ from: "a", to: "a" }] },
          new Set(["gate"])
        ).pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
  })

  test("validate: zero nodes → CARD_INVALID", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        return yield* codec.validate({ name: "w", nodes: [] }, new Set()).pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
  })

  test("validate: duplicate node ids → CARD_INVALID", async () => {
    const caught = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        return yield* codec.validate(
          { name: "w", nodes: [{ id: "a", type: "g" }, { id: "a", type: "g" }] },
          new Set(["g"])
        ).pipe(Effect.flip)
      })
    )
    expect(caught._tag).toBe("CARD_INVALID")
  })

  test("validate: linear a→b passes, encode round-trips the name", async () => {
    const name = await run(
      Effect.gen(function*() {
        const codec = yield* WorkflowCodec
        const valid = yield* codec.validate(
          {
            name: "chain",
            nodes: [{ id: "a", type: "gate" }, { id: "b", type: "gate" }],
            edges: [{ from: "a", to: "b" }]
          },
          new Set(["gate"])
        )
        const back = (yield* codec.encode(valid.doc)) as { name: string }
        return back.name
      })
    )
    expect(name).toBe("chain")
  })
})

describe("Error channel", () => {
  test("all 15 tags present — channel totality", () => {
    expect(KERNEL_ERROR_TAGS.length).toBe(15)
    expect(new Set(KERNEL_ERROR_TAGS).size).toBe(15)
  })

  test("each tag constructs with a message and carries its _tag", () => {
    const instances = [
      new CardInvalid({ message: "m" }),
      new FutureBarLeak({ message: "m" }),
      new DesignationIncomplete({ message: "m" }),
      new SideInversionViolation({ message: "m" }),
      new E3DisobeyedE2({ message: "m" }),
      new MirrorFloorContradicted({ message: "m" }),
      new CascadeDivergenceExceeded({ message: "m" }),
      new DegenerateTpCap({ message: "m" }),
      new RrrFloorViolation({ message: "m" }),
      new FrozenFileTouched({ message: "m" }),
      new ChartFail({ message: "m" }),
      new AetherDegrade({ message: "m" }),
      new AetherApiUnreachable({ message: "m" }),
      new JournalCorrupt({ message: "m" }),
      new OracleIsolationViolated({ message: "m" })
    ]
    expect(instances.length).toBe(15)
    const tags = instances.map((e) => (e as { _tag: string })._tag).sort()
    expect(tags).toEqual([...KERNEL_ERROR_TAGS].sort())
    // Yieldable in Effect.gen — the typed channel actually carries them
    return Effect.runPromise(
      Effect.gen(function*() {
        const caught = yield* Effect.fail(new RrrFloorViolation({ message: "rrr", rrr: 1.2 })).pipe(
          Effect.flip
        )
        if (caught._tag !== "RRR_FLOOR_VIOLATION") throw new Error("tag mismatch")
      })
    )
  })
})

describe("OpenCodeLive stubs", () => {
  test("ToolClient stub fails loud with AETHER_DEGRADE", async () => {
    const caught = await Effect.runPromise(
      Effect.gen(function*() {
        const tc = yield* ToolClient
        return yield* tc.invoke("t", {}).pipe(Effect.flip)
      }).pipe(Effect.provide(ToolClientStubLive)) as Effect.Effect<unknown, { _tag: string }>
    )
    expect((caught as { _tag: string })._tag).toBe("AETHER_DEGRADE")
  })

  test("Subagent stub fails loud", async () => {
    const caught = await Effect.runPromise(
      Effect.gen(function*() {
        const s = yield* SubagentRunner
        return yield* s.dispatch("task", {}).pipe(Effect.flip)
      }).pipe(Effect.provide(SubagentStubLive)) as Effect.Effect<unknown, { _tag: string }>
    )
    expect((caught as { _tag: string })._tag).toBe("AETHER_DEGRADE")
  })

  test("Llm stub fails loud (Tier-1 has no llm in R — E9)", async () => {
    const caught = await Effect.runPromise(
      Effect.gen(function*() {
        const llm = yield* LlmClient
        return yield* llm.complete("hi").pipe(Effect.flip)
      }).pipe(Effect.provide(LlmStubLive)) as Effect.Effect<unknown, { _tag: string }>
    )
    expect((caught as { _tag: string })._tag).toBe("AETHER_DEGRADE")
  })

  test("HooksBus stub fails loud", async () => {
    const caught = await Effect.runPromise(
      Effect.gen(function*() {
        const bus = yield* HooksBus
        return yield* bus.emit("ev", {}).pipe(Effect.flip)
      }).pipe(Effect.provide(HooksBusStubLive)) as Effect.Effect<unknown, { _tag: string }>
    )
    expect((caught as { _tag: string })._tag).toBe("AETHER_DEGRADE")
  })
})

describe("TestLive clock", () => {
  test("sleep(1 hour) completes after TestClock.adjust — near-zero wall time", async () => {
    const wallStart = Date.now()
    await Effect.runPromise(
      Effect.gen(function*() {
        const fiber = yield* Effect.sleep("1 hour").pipe(Effect.forkChild)
        yield* TestClock.adjust("1 hour")
        yield* Fiber.join(fiber)
        const now = yield* Clock.currentTimeMillis
        expect(now).toBeGreaterThan(0)
      }).pipe(Effect.provide(TestLive)) as Effect.Effect<void>
    )
    expect(Date.now() - wallStart).toBeLessThan(10_000)
  })

  test("timeout fires deterministically under TestClock", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function*() {
        const fiber = yield* Effect.sleep("5 minutes").pipe(
          Effect.timeoutOption("1 minute"),
          Effect.forkChild
        )
        yield* TestClock.adjust("1 minute")
        return yield* Fiber.join(fiber)
      }).pipe(Effect.provide(TestLive)) as Effect.Effect<unknown>
    )
    // Effect.timeoutOption returns Option: None on timeout (v4 Option is a
    // class instance — assert via the predicate, not structural equality).
    expect(Option.isNone(result as Option.Option<unknown>)).toBe(true)
  })
})
