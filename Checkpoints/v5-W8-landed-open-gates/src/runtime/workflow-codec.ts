/**
 * WorkflowCodec — Schema gate at the document boundary (E4).
 *
 * Decodes unknown JSON into a WorkflowDoc BEFORE any fiber starts. Unknown node
 * `type`, dangling edges, and cycles are refused here — loud, no artifact.
 * `JSON.parse` is never a codec: callers parse text to unknown, then decode here.
 */

import { Context, Effect, Layer, Schema } from "effect"
import { CardInvalid } from "./errors.ts"

export const WorkflowNodeSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  params: Schema.optional(Schema.Record(Schema.String, Schema.Unknown))
})
export type WorkflowNode = typeof WorkflowNodeSchema.Type

export const WorkflowEdgeSchema = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  channel: Schema.optional(Schema.String)
})
export type WorkflowEdge = typeof WorkflowEdgeSchema.Type

export const WorkflowDocSchema = Schema.Struct({
  name: Schema.String,
  tier: Schema.optional(Schema.Literals(["T1", "T2", "T3"])),
  nodes: Schema.Array(WorkflowNodeSchema),
  edges: Schema.optional(Schema.Array(WorkflowEdgeSchema))
})
export type WorkflowDoc = typeof WorkflowDocSchema.Type

/** A structurally valid, executable document (decode + graph checks passed). */
export interface ValidWorkflow {
  readonly doc: WorkflowDoc
  readonly nodeIds: ReadonlySet<string>
}

const findCycle = (nodeIds: ReadonlyArray<string>, edges: ReadonlyArray<WorkflowEdge>): ReadonlyArray<string> | null => {
  const adj = new Map<string, string[]>()
  for (const id of nodeIds) adj.set(id, [])
  for (const e of edges) adj.get(e.from)?.push(e.to)
  const color = new Map<string, 0 | 1 | 2>()
  const stack: string[] = []
  const visit = (n: string): ReadonlyArray<string> | null => {
    color.set(n, 1)
    stack.push(n)
    for (const m of adj.get(n) ?? []) {
      const c = color.get(m) ?? 0
      if (c === 1) return [...stack.slice(stack.indexOf(m)), m]
      if (c === 0) {
        const hit = visit(m)
        if (hit !== null) return hit
      }
    }
    stack.pop()
    color.set(n, 2)
    return null
  }
  for (const id of nodeIds) {
    if ((color.get(id) ?? 0) === 0) {
      const hit = visit(id)
      if (hit !== null) return hit
    }
  }
  return null
}

export class WorkflowCodec extends Context.Service<WorkflowCodec, {
  /** Decode unknown input to a WorkflowDoc; schema failures → CARD_INVALID. */
  readonly decode: (input: unknown) => Effect.Effect<WorkflowDoc, CardInvalid>
  /**
   * Full gate: decode + unknown-type check + dangling-edge check + cycle check.
   * `knownTypes` is the registry's kind set at call time.
   */
  readonly validate: (
    input: unknown,
    knownTypes: ReadonlySet<string>
  ) => Effect.Effect<ValidWorkflow, CardInvalid>
  /** Encode a WorkflowDoc back to plain JSON (for the journal / artifacts). */
  readonly encode: (doc: WorkflowDoc) => Effect.Effect<unknown>
}>()("WorkflowCodec") {}

export const makeWorkflowCodec = Effect.gen(function*() {
  const decode = (input: unknown): Effect.Effect<WorkflowDoc, CardInvalid> =>
    Schema.decodeUnknownEffect(WorkflowDocSchema)(input).pipe(
      Effect.mapError(
        (issue) => new CardInvalid({ message: `workflow schema decode failed: ${String(issue)}` })
      )
    )

  const validate = (
    input: unknown,
    knownTypes: ReadonlySet<string>
  ): Effect.Effect<ValidWorkflow, CardInvalid> =>
    Effect.gen(function*() {
      const doc = yield* decode(input)
      if (doc.nodes.length === 0) {
        return yield* new CardInvalid({ message: "workflow refused: zero nodes" })
      }
      const ids = doc.nodes.map((n) => n.id)
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
      if (dupes.length > 0) {
        return yield* new CardInvalid({ message: `workflow refused: duplicate node ids: ${dupes.join(",")}` })
      }
      for (const node of doc.nodes) {
        if (!knownTypes.has(node.type)) {
          return yield* new CardInvalid({ message: `workflow refused: unknown node type "${node.type}" on node "${node.id}"` })
        }
      }
      const idSet = new Set(ids)
      const edges = doc.edges ?? []
      for (const e of edges) {
        if (!idSet.has(e.from) || !idSet.has(e.to)) {
          return yield* new CardInvalid({
            message: `workflow refused: dangling edge ${e.from} -> ${e.to}`
          })
        }
      }
      const cycle = findCycle(ids, edges)
      if (cycle !== null) {
        return yield* new CardInvalid({ message: `workflow refused: cycle ${cycle.join(" -> ")}` })
      }
      return { doc, nodeIds: idSet } as ValidWorkflow
    })

  const encode = (doc: WorkflowDoc): Effect.Effect<unknown> =>
    Schema.encodeEffect(WorkflowDocSchema)(doc).pipe(
      Effect.orElseSucceed(() => JSON.parse(JSON.stringify(doc)) as unknown)
    )

  return WorkflowCodec.of({ decode, validate, encode })
})

export const WorkflowCodecLive: Layer.Layer<WorkflowCodec> = Layer.effect(WorkflowCodec, makeWorkflowCodec)
