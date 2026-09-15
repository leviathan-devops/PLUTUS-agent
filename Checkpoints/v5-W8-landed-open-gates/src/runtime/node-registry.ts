/**
 * NodeRegistry — `Map<kind, NodeImpl>` where every impl returns an Effect.
 *
 * No `Promise` in the interface (Bible §2.2). Drivers adapt foreign promises at
 * the cap boundary only (`Effect.tryPromise`). Unknown-kind lookup fails loud
 * with CARD_INVALID — the same code the codec uses for unknown `type`, so the
 * gate and the runtime agree on the vocabulary.
 */

import { Context, Effect, Layer, Ref } from "effect"
import { CardInvalid } from "./errors.ts"

/** Node family — mirrors the Bible §2.2 family column. */
export type NodeFamily =
  | "event"
  | "decision"
  | "generation"
  | "orchestration"
  | "evidence"
  | "execution"

/** A pipeline node implementation. Invoke is a pure Effect value (E1). */
export interface NodeImpl {
  readonly kind: string
  readonly family: NodeFamily
  /** Service keys this node requires in R (capability names). */
  readonly requires: ReadonlyArray<string>
  readonly invoke: (input: unknown) => Effect.Effect<unknown, CardInvalid>
}

export class NodeRegistry extends Context.Service<NodeRegistry, {
  /** Register one impl; duplicate kind → CARD_INVALID (loud, no overwrite). */
  readonly register: (impl: NodeImpl) => Effect.Effect<void, CardInvalid>
  /** Look up by kind; miss → CARD_INVALID. */
  readonly lookup: (kind: string) => Effect.Effect<NodeImpl, CardInvalid>
  /** All registered kinds (feeds the codec's knownTypes set). */
  readonly kinds: () => Effect.Effect<ReadonlySet<string>>
  /** Number of registered impls. */
  readonly size: () => Effect.Effect<number>
}>()("NodeRegistry") {}

export const makeNodeRegistry = Effect.gen(function*() {
  const ref = yield* Ref.make<ReadonlyMap<string, NodeImpl>>(new Map())

  const register = (impl: NodeImpl): Effect.Effect<void, CardInvalid> =>
    Effect.gen(function*() {
      if (impl.kind.length === 0) {
        return yield* new CardInvalid({ message: "registry refused: empty kind" })
      }
      const prev = yield* Ref.get(ref)
      if (prev.has(impl.kind)) {
        return yield* new CardInvalid({ message: `registry refused: duplicate kind "${impl.kind}"` })
      }
      yield* Ref.update(ref, (m) => new Map(m).set(impl.kind, impl))
    })

  const lookup = (kind: string): Effect.Effect<NodeImpl, CardInvalid> =>
    Effect.gen(function*() {
      const prev = yield* Ref.get(ref)
      const impl = prev.get(kind)
      if (impl === undefined) {
        return yield* new CardInvalid({ message: `registry: unknown node kind "${kind}"` })
      }
      return impl
    })

  const kinds = (): Effect.Effect<ReadonlySet<string>> =>
    Ref.get(ref).pipe(Effect.map((m) => new Set(m.keys())))

  const size = (): Effect.Effect<number> => Ref.get(ref).pipe(Effect.map((m) => m.size))

  return NodeRegistry.of({ register, lookup, kinds, size })
})

export const NodeRegistryLive: Layer.Layer<NodeRegistry> = Layer.effect(NodeRegistry, makeNodeRegistry)
