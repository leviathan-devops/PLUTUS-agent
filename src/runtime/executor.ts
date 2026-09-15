/**
 * Executor — the readiness-loop runner (Bible §2.6, catalog 5K-5).
 *
 * Ready nodes fan out with `Effect.forEach(..., { concurrency: KERNEL_CONCURRENCY })`
 * — never `Promise.all` (E6). One child failing does not kill siblings: each node
 * runs journaled as an Activity pair (`activity.start` / `activity.done|fail`) and
 * the batch returns per-node `Exit`s, so the caller sees every outcome.
 */

import { Context, Effect, Exit, Layer } from "effect"
import { CardInvalid } from "./errors.ts"
import { Journal } from "./journal.ts"
import { NodeRegistry } from "./node-registry.ts"

/** Spec D.4 — ready-set fan-out width. */
export const KERNEL_CONCURRENCY = 15
/** Spec D.4 — generation repair budget (consumed by retry-chain nodes, W3+). */
export const JESL_MAX_RETRIES = 2

/** One unit of work for the executor. */
export interface NodeTask {
  readonly id: string
  readonly kind: string
  readonly input: unknown
  readonly causationId: string
}

/** Per-node outcome — every sibling reports, none is swallowed. */
export interface NodeOutcome {
  readonly id: string
  readonly kind: string
  readonly exit: Exit.Exit<unknown, CardInvalid>
}

export class Executor extends Context.Service<Executor, {
  /** Run one task through the registry with Activity journaling. */
  readonly runOne: (task: NodeTask) => Effect.Effect<unknown, CardInvalid, never>
  /**
   * Run a ready set with KERNEL_CONCURRENCY fan-out. Never fails on a single
   * child's error — returns one outcome per task (E6 allSettled semantics).
   */
  readonly runBatch: (
    tasks: ReadonlyArray<NodeTask>
  ) => Effect.Effect<ReadonlyArray<NodeOutcome>, never>
}>("Executor") {}

export const makeExecutor = Effect.gen(function*() {
  const journal = yield* Journal
  const registry = yield* NodeRegistry

  const runOne = (task: NodeTask): Effect.Effect<unknown, CardInvalid, never> =>
    Effect.gen(function*() {
      if (task.id.length === 0) {
        return yield* new CardInvalid({ message: "executor refused: empty task id" })
      }
      const impl = yield* registry.lookup(task.kind)
      yield* journal.append({
        causationId: task.causationId,
        kind: "activity.start",
        payload: { nodeId: task.id, nodeKind: task.kind, family: impl.family }
      })
      const result = yield* impl.invoke(task.input).pipe(
        Effect.tap((value) =>
          journal.append({
            causationId: task.causationId,
            kind: "activity.done",
            payload: { nodeId: task.id, nodeKind: task.kind, value: String(value) }
          })
        ),
        Effect.tapError((error) =>
          journal.append({
            causationId: task.causationId,
            kind: "activity.fail",
            payload: { nodeId: task.id, nodeKind: task.kind, error: error.message }
          })
        )
      )
      return result
    })

  const runBatch = (
    tasks: ReadonlyArray<NodeTask>
  ): Effect.Effect<ReadonlyArray<NodeOutcome>, never> =>
    Effect.forEach(
      tasks,
      (task) =>
        Effect.exit(runOne(task)).pipe(
          Effect.map((exit): NodeOutcome => ({ id: task.id, kind: task.kind, exit }))
        ),
      { concurrency: KERNEL_CONCURRENCY }
    )

  return Executor.of({ runOne, runBatch })
})

export const ExecutorLive: Layer.Layer<Executor, never, Journal | NodeRegistry> = Layer.effect(
  Executor,
  makeExecutor
)
