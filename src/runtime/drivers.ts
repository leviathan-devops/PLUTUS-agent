/**
 * Drivers — the ONLY execution edges (E1 / E10).
 *
 * Construction is not execution: services compose as Layers here, and exactly one
 * `run*` per driver edge discharges the program. Kernel modules never call
 * `Effect.runPromise` — only these edges do.
 *
 * Driver map (Bible §2.5):
 * ```
 * CliLive      = Journal.file + WorkflowCodec + NodeRegistry + Executor
 * OpenCodeLive = CliLive + ToolClient + Subagent + Llm + HooksBus (STUBS — W7 wires)
 * TestLive     = TestClock + InMemoryJournal + WorkflowCodec + NodeRegistry + Executor
 * ```
 *
 * @effect/platform (FileSystem/Http/Command) is NOT installed in this repo, so
 * CliLive's Journal.file persists via `node:fs/promises` at the driver edge only
 * (drivers adapt foreign promises via `Effect.tryPromise` — Bible §2.2). When the
 * platform packages land, the file implementation swaps without touching journal.ts.
 */

import { promises as fs } from "node:fs"
import { Context, Effect, Layer } from "effect"
import { TestClock } from "effect/testing"
import { AetherDegrade, CardInvalid, JournalCorrupt } from "./errors.ts"
import { Journal, JournalEntry, JournalMemoryLive, makeMemoryJournal } from "./journal.ts"
import { NodeRegistry, NodeRegistryLive } from "./node-registry.ts"
import { Executor, ExecutorLive } from "./executor.ts"
import { WorkflowCodec, WorkflowCodecLive } from "./workflow-codec.ts"

/* ── Host-specific service tags (STUBBED — real wiring lands W7) ──────────── */

export class ToolClient extends Context.Service<ToolClient, {
  readonly invoke: (tool: string, args: unknown) => Effect.Effect<unknown, AetherDegrade>
}>()("ToolClient") {}

export class SubagentRunner extends Context.Service<SubagentRunner, {
  readonly dispatch: (task: string, input: unknown) => Effect.Effect<unknown, AetherDegrade>
}>()("SubagentRunner") {}

export class LlmClient extends Context.Service<LlmClient, {
  readonly complete: (prompt: string) => Effect.Effect<string, AetherDegrade>
}>()("LlmClient") {}

export class HooksBus extends Context.Service<HooksBus, {
  readonly emit: (event: string, payload: unknown) => Effect.Effect<void, AetherDegrade>
}>()("HooksBus") {}

const STUB_W7 = "host service stub — real wiring lands W7"

export const ToolClientStubLive: Layer.Layer<ToolClient> = Layer.succeed(
  ToolClient,
  ToolClient.of({
    invoke: (_tool, _args) => Effect.fail(new AetherDegrade({ message: `ToolClient.${STUB_W7}` }))
  })
)

export const SubagentStubLive: Layer.Layer<SubagentRunner> = Layer.succeed(
  SubagentRunner,
  SubagentRunner.of({
    dispatch: (_task, _input) => Effect.fail(new AetherDegrade({ message: `SubagentRunner.${STUB_W7}` }))
  })
)

export const LlmStubLive: Layer.Layer<LlmClient> = Layer.succeed(
  LlmClient,
  LlmClient.of({
    complete: (_prompt) => Effect.fail(new AetherDegrade({ message: `LlmClient.${STUB_W7}` }))
  })
)

export const HooksBusStubLive: Layer.Layer<HooksBus> = Layer.succeed(
  HooksBus,
  HooksBus.of({
    emit: (_event, _payload) => Effect.fail(new AetherDegrade({ message: `HooksBus.${STUB_W7}` }))
  })
)

/* ── Journal.file — file-backed journal for the CLI edge ──────────────────── */

const readJournalFile = (path: string): Effect.Effect<ReadonlyArray<JournalEntry>, CardInvalid> =>
  Effect.tryPromise({
    try: async () => {
      try {
        const text = await fs.readFile(path, "utf8")
        if (text.trim().length === 0) return []
        return text
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => JSON.parse(line) as JournalEntry)
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
        throw error
      }
    },
    catch: (error) => new CardInvalid({ message: `journal file read failed: ${String(error)}` })
  })

/** File-backed Journal layer: seeds from JSONL on build, appends through. */
export const makeJournalFileLive = (path: string): Layer.Layer<Journal, CardInvalid | JournalCorrupt> =>
  Layer.effect(
    Journal,
    Effect.gen(function*() {
      const seed = yield* readJournalFile(path)
      const mem = yield* makeMemoryJournal
      for (const row of seed) {
        yield* mem.append({ causationId: row.causationId, kind: "journal.replay", payload: row }).pipe(
          Effect.asVoid
        )
      }
      const persist = (entry: JournalEntry): Effect.Effect<void, CardInvalid> =>
        Effect.tryPromise({
          try: () => fs.appendFile(path, `${JSON.stringify(entry)}\n`, "utf8").then(() => undefined),
          catch: (error) => new CardInvalid({ message: `journal file append failed: ${String(error)}` })
        })
      return Journal.of({
        append: (input) => mem.append(input).pipe(Effect.tap(persist)),
        query: (causationId) => mem.query(causationId),
        all: () => mem.all(),
        checkIntegrity: () => mem.checkIntegrity(),
        corruptForTest: (_seq, _patch) =>
          Effect.fail(new CardInvalid({ message: "corruptForTest refused on file-backed journal" }))
      })
    })
  )

/* ── The three drivers ────────────────────────────────────────────────────── */

/**
 * v4-beta composition rule (measured — see build report): `Layer.mergeAll` does
 * NOT wire cross-layer dependencies in `effect@4.0.0-beta.74`. A layer with
 * unmet requirements (Executor → Journal + NodeRegistry) must be saturated with
 * `Layer.provide(deps)` BEFORE it enters a merge. Every composed driver below
 * follows the provide-first pattern.
 */

/** Saturate the Executor's (Journal + NodeRegistry) requirements against a
 * concrete base, returning a dependency-free Executor layer sharing the base.
 */
const saturateExecutor = <E>(
  base: Layer.Layer<Journal | NodeRegistry, E>
): Layer.Layer<Executor, E> => ExecutorLive.pipe(Layer.provide(base)) as Layer.Layer<Executor, E>

/** Build the full kernel (stateless + journal + saturated executor) on any journal. */
const buildKernel = <E>(
  journalLayer: Layer.Layer<Journal, E>
): Layer.Layer<Journal | WorkflowCodec | NodeRegistry | Executor, E> => {
  const base = Layer.mergeAll(journalLayer, WorkflowCodecLive, NodeRegistryLive) as Layer.Layer<
    Journal | WorkflowCodec | NodeRegistry,
    E
  >
  return Layer.mergeAll(base, saturateExecutor(base)) as Layer.Layer<
    Journal | WorkflowCodec | NodeRegistry | Executor,
    E
  >
}

/** Kernel layer on the in-memory journal (shared by TestLive). */
export const KernelMemoryLive: Layer.Layer<Journal | WorkflowCodec | NodeRegistry | Executor> =
  buildKernel(JournalMemoryLive)

/** CliLive — bun-run execution edge for workflows (file journal at the given path). */
export const makeCliLive = (
  journalPath: string
): Layer.Layer<Journal | WorkflowCodec | NodeRegistry | Executor, CardInvalid | JournalCorrupt> =>
  buildKernel(makeJournalFileLive(journalPath))

/**
 * TestLive — TestClock + InMemoryJournal + kernel services for fixtures.
 * No wall-clock, no disk: `TestClock.adjust` drives all time.
 */
export const TestLive: Layer.Layer<Journal | WorkflowCodec | NodeRegistry | Executor | TestClock.TestClock> =
  Layer.mergeAll(KernelMemoryLive, TestClock.layer())

/** OpenCodeLive — plugin-host driver; host services are loud stubs until W7. */
export const makeOpenCodeLive = (
  journalPath: string
): Layer.Layer<
  Journal | WorkflowCodec | NodeRegistry | Executor | ToolClient | SubagentRunner | LlmClient | HooksBus,
  CardInvalid | JournalCorrupt
> =>
  Layer.mergeAll(
    makeCliLive(journalPath),
    ToolClientStubLive,
    SubagentStubLive,
    LlmStubLive,
    HooksBusStubLive
  )

/* ── Run edges (exactly one run* per driver invocation — E10) ─────────────── */

/** Discharge a CLI program (bun-run edge). */
export const runCli = <A, E>(program: Effect.Effect<A, E, Journal | WorkflowCodec | NodeRegistry | Executor>, journalPath: string): Promise<A> =>
  Effect.runPromise(program.pipe(Effect.provide(makeCliLive(journalPath))) as Effect.Effect<A, E>)

/** Discharge a fixture program under TestLive. */
export const runTest = <A, E>(
  program: Effect.Effect<A, E, Journal | WorkflowCodec | NodeRegistry | Executor | TestClock.TestClock>
): Promise<A> => Effect.runPromise(program.pipe(Effect.provide(TestLive)) as Effect.Effect<A, E>)
