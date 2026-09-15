/**
 * Plutus kernel typed error channel (spec D.3).
 *
 * Every error is a `Schema.TaggedErrorClass` — the `_tag` IS the machine-readable
 * code, so `E` in `Effect<A, E, R>` is a discriminated union the JESL engine can
 * match exhaustively. No `throw new Error(string)` anywhere in the kernel plane.
 *
 * v4-beta API note (installed `effect@4.0.0-beta.74` wins over the Bible's v3-era
 * examples): the constructor is `Schema.TaggedErrorClass<Self>()("TAG", fields)`.
 * Verified against node_modules/effect/src/Schema.ts (`TaggedErrorClass`, ~L12391).
 */

import { Schema } from "effect"

/** Trade card failed schema validation. */
export class CardInvalid extends Schema.TaggedErrorClass<CardInvalid>()("CARD_INVALID", {
  message: Schema.String,
  detail: Schema.optional(Schema.String)
}) {}

/** A computation read a bar at index > the decision bar (lookahead). */
export class FutureBarLeak extends Schema.TaggedErrorClass<FutureBarLeak>()("FUTURE_BAR_LEAK", {
  message: Schema.String,
  barIndex: Schema.optional(Schema.Number),
  decisionIndex: Schema.optional(Schema.Number)
}) {}

/** Designation totality violated — a (day, direction, pair) cell has no designation. */
export class DesignationIncomplete extends Schema.TaggedErrorClass<DesignationIncomplete>()(
  "DESIGNATION_INCOMPLETE",
  {
    message: Schema.String,
    missing: Schema.optional(Schema.Array(Schema.String))
  }
) {}

/** E2 emitted a side opposite to the zone's resting side. */
export class SideInversionViolation extends Schema.TaggedErrorClass<SideInversionViolation>()(
  "SIDE_INVERSION_VIOLATION",
  {
    message: Schema.String,
    zoneId: Schema.optional(Schema.String),
    expectedSide: Schema.optional(Schema.String),
    actualSide: Schema.optional(Schema.String)
  }
) {}

/** E3 anchor disobeyed the E2 designation it was bound to. */
export class E3DisobeyedE2 extends Schema.TaggedErrorClass<E3DisobeyedE2>()("E3_DISOBEYED_E2", {
  message: Schema.String,
  designationId: Schema.optional(Schema.String)
}) {}

/** Mirror-floor discharge contradicted the computed floor value. */
export class MirrorFloorContradicted extends Schema.TaggedErrorClass<MirrorFloorContradicted>()(
  "MIRROR_FLOOR_CONTRADICTED",
  {
    message: Schema.String,
    expected: Schema.optional(Schema.Number),
    actual: Schema.optional(Schema.Number)
  }
) {}

/** Cascade propagation diverged beyond the allowed tolerance. */
export class CascadeDivergenceExceeded extends Schema.TaggedErrorClass<CascadeDivergenceExceeded>()(
  "CASCADE_DIVERGENCE_EXCEEDED",
  {
    message: Schema.String,
    divergencePips: Schema.optional(Schema.Number)
  }
) {}

/** Take-profit structure degenerated (e.g. TP below entry on a long). */
export class DegenerateTpCap extends Schema.TaggedErrorClass<DegenerateTpCap>()("DEGENERATE_TP_CAP", {
  message: Schema.String,
  leg: Schema.optional(Schema.String)
}) {}

/** Reward:risk below the 2.5 floor (D-R1). */
export class RrrFloorViolation extends Schema.TaggedErrorClass<RrrFloorViolation>()(
  "RRR_FLOOR_VIOLATION",
  {
    message: Schema.String,
    rrr: Schema.optional(Schema.Number),
    floor: Schema.optional(Schema.Number)
  }
) {}

/** A write touched a frozen file (sl-lmv.ts / trade-dedup.ts through W5). */
export class FrozenFileTouched extends Schema.TaggedErrorClass<FrozenFileTouched>()(
  "FROZEN_FILE_TOUCHED",
  {
    message: Schema.String,
    path: Schema.optional(Schema.String)
  }
) {}

/** Chart render / verify failed (corrupt screenshot, missing pair). */
export class ChartFail extends Schema.TaggedErrorClass<ChartFail>()("CHART_FAIL", {
  message: Schema.String,
  pair: Schema.optional(Schema.String)
}) {}

/** Aether (chart-verifier sidecar) degraded — loud manifest, 0.70 cap downstream. */
export class AetherDegrade extends Schema.TaggedErrorClass<AetherDegrade>()("AETHER_DEGRADE", {
  message: Schema.String,
  manifest: Schema.optional(Schema.String)
}) {}

/** Aether sidecar unreachable — no verification possible, fail loud. */
export class AetherApiUnreachable extends Schema.TaggedErrorClass<AetherApiUnreachable>()(
  "AETHER_API_UNREACHABLE",
  {
    message: Schema.String,
    endpoint: Schema.optional(Schema.String)
  }
) {}

/** Journal hash chain broke — replay state untrustworthy, halt the run. */
export class JournalCorrupt extends Schema.TaggedErrorClass<JournalCorrupt>()("JOURNAL_CORRUPT", {
  message: Schema.String,
  seq: Schema.optional(Schema.Number),
  expectedHash: Schema.optional(Schema.String),
  actualHash: Schema.optional(Schema.String)
}) {}

/** Oracle data crossed the isolation boundary (oracle values in prompts/decisions). */
export class OracleIsolationViolated extends Schema.TaggedErrorClass<OracleIsolationViolated>()(
  "ORACLE_ISOLATION_VIOLATED",
  {
    message: Schema.String,
    source: Schema.optional(Schema.String)
  }
) {}

/** The full typed error channel of the kernel plane. */
export type KernelError =
  | CardInvalid
  | FutureBarLeak
  | DesignationIncomplete
  | SideInversionViolation
  | E3DisobeyedE2
  | MirrorFloorContradicted
  | CascadeDivergenceExceeded
  | DegenerateTpCap
  | RrrFloorViolation
  | FrozenFileTouched
  | ChartFail
  | AetherDegrade
  | AetherApiUnreachable
  | JournalCorrupt
  | OracleIsolationViolated

/** All 15 error tags — used by tests to prove channel totality. */
export const KERNEL_ERROR_TAGS = [
  "CARD_INVALID",
  "FUTURE_BAR_LEAK",
  "DESIGNATION_INCOMPLETE",
  "SIDE_INVERSION_VIOLATION",
  "E3_DISOBEYED_E2",
  "MIRROR_FLOOR_CONTRADICTED",
  "CASCADE_DIVERGENCE_EXCEEDED",
  "DEGENERATE_TP_CAP",
  "RRR_FLOOR_VIOLATION",
  "FROZEN_FILE_TOUCHED",
  "CHART_FAIL",
  "AETHER_DEGRADE",
  "AETHER_API_UNREACHABLE",
  "JOURNAL_CORRUPT",
  "ORACLE_ISOLATION_VIOLATED"
] as const
