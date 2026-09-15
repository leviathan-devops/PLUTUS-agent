/**
 * Journal — append-only Effect journal with a sha256 hash chain.
 *
 * Every entry commits to the previous entry's hash (`prevHash` + `entryHash`), so
 * any tamper or truncation breaks the chain and surfaces as JOURNAL_CORRUPT —
 * loud, never silent. Verdicts are computed FROM journal rows, never from prose.
 *
 * Hashing uses `node:crypto` createHash — a pure function, not an I/O capability,
 * so it lives in the kernel (E3 bans `node:fs`/fetch/clock/random, not pure
 * hashing). File persistence lives in drivers.ts (the driver edge), never here.
 */

import { createHash } from "node:crypto"
import { Context, Effect, Layer, Ref, Schema } from "effect"
import { JournalCorrupt } from "./errors.ts"

/** A single committed journal row. */
export const JournalEntrySchema = Schema.Struct({
  seq: Schema.Number,
  causationId: Schema.String,
  kind: Schema.String,
  payload: Schema.String,
  prevHash: Schema.String,
  entryHash: Schema.String
})
export type JournalEntry = typeof JournalEntrySchema.Type

/** Input for append — the chain fields are computed by the service. */
export interface JournalAppendInput {
  readonly causationId: string
  readonly kind: string
  /** JSON-serializable payload; stored stringified so the hash commits to bytes. */
  readonly payload: unknown
}

const GENESIS_HASH = "GENESIS"

const sha256Hex = (data: string): string => createHash("sha256").update(data, "utf8").digest("hex")

const hashEntry = (seq: number, causationId: string, kind: string, payload: string, prevHash: string): string =>
  sha256Hex(`${seq}|${causationId}|${kind}|${payload}|${prevHash}`)

/** The Journal service interface (Context.Tag). */
export class Journal extends Context.Service<Journal, {
  /** Append one row; returns the committed entry with chain hashes. */
  readonly append: (input: JournalAppendInput) => Effect.Effect<JournalEntry, JournalCorrupt>
  /** All rows with the given causationId, in seq order. Empty array when none. */
  readonly query: (causationId: string) => Effect.Effect<ReadonlyArray<JournalEntry>>
  /** All rows in seq order. */
  readonly all: () => Effect.Effect<ReadonlyArray<JournalEntry>>
  /** Re-hash the full chain; fails JOURNAL_CORRUPT naming the first broken seq. */
  readonly checkIntegrity: () => Effect.Effect<void, JournalCorrupt>
  /** TEST-ONLY hook: overwrite the row at seq (simulates tamper/corruption). */
  readonly corruptForTest: (seq: number, patch: Partial<JournalEntry>) => Effect.Effect<void>
}>("Journal") {}

/** Build an in-memory Journal implementation (shared by all drivers). */
export const makeMemoryJournal = Effect.gen(function*() {
  const ref = yield* Ref.make<JournalEntry[]>([])

  const append = (input: JournalAppendInput): Effect.Effect<JournalEntry, JournalCorrupt> =>
    Effect.gen(function*() {
      if (input.causationId.length === 0) {
        return yield* new JournalCorrupt({ message: "append refused: empty causationId" })
      }
      if (input.kind.length === 0) {
        return yield* new JournalCorrupt({ message: "append refused: empty kind" })
      }
      const payload = JSON.stringify(input.payload ?? null)
      const rows = yield* Ref.get(ref)
      const prevHash = rows.length === 0 ? GENESIS_HASH : (rows[rows.length - 1] as JournalEntry).entryHash
      const seq = rows.length
      const entry: JournalEntry = {
        seq,
        causationId: input.causationId,
        kind: input.kind,
        payload,
        prevHash,
        entryHash: hashEntry(seq, input.causationId, input.kind, payload, prevHash)
      }
      yield* Ref.update(ref, (prev) => [...prev, entry])
      return entry
    })

  const query = (causationId: string): Effect.Effect<ReadonlyArray<JournalEntry>> =>
    Ref.get(ref).pipe(Effect.map((rows) => rows.filter((r) => r.causationId === causationId)))

  const all = (): Effect.Effect<ReadonlyArray<JournalEntry>> => Ref.get(ref)

  const checkIntegrity = (): Effect.Effect<void, JournalCorrupt> =>
    Effect.gen(function*() {
      const rows = yield* Ref.get(ref)
      let prev = GENESIS_HASH
      for (const row of rows) {
        if (row.prevHash !== prev) {
          return yield* new JournalCorrupt({
            message: `chain break at seq ${row.seq}: prevHash mismatch`,
            seq: row.seq,
            expectedHash: prev,
            actualHash: row.prevHash
          })
        }
        const recomputed = hashEntry(row.seq, row.causationId, row.kind, row.payload, row.prevHash)
        if (recomputed !== row.entryHash) {
          return yield* new JournalCorrupt({
            message: `chain break at seq ${row.seq}: entryHash mismatch`,
            seq: row.seq,
            expectedHash: recomputed,
            actualHash: row.entryHash
          })
        }
        prev = row.entryHash
      }
    })

  const corruptForTest = (seq: number, patch: Partial<JournalEntry>): Effect.Effect<void> =>
    Ref.update(ref, (rows) => rows.map((r) => (r.seq === seq ? { ...r, ...patch } : r)))

  return Journal.of({ append, query, all, checkIntegrity, corruptForTest })
})

/** In-memory Journal layer (TestLive default; CliLive seeds from disk at the edge). */
export const JournalMemoryLive: Layer.Layer<Journal> = Layer.effect(Journal, makeMemoryJournal)
