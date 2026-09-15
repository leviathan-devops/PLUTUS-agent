/**
 * pressureActor — the per-zone lifecycle tracker (XState v5, spec B.W2.4 +
 * the zone-pressure doctrine B.W2.3 MACHINE 4).
 *
 * Lifecycle: VIRGIN -> ACTIVE_1 -> ACTIVE_2 -> DEPLETED | FORTRESS | BROKEN.
 * - The battle-count guard: ONLY SWEEP advances reactionCount. Touches
 *   (WICK_REJECT / BODY_DEFEND / CONSOL_DWELL) record a defense instead.
 * - The 4H-never-death guard: tf === '4H' REFUSES the DEPLETED transition —
 *   the 3rd sweep still counts (reactionCount 3) but the state holds ACTIVE_2.
 * - The fortress guard: on the would-be death sweep, defendedAtMs newer than
 *   the previous eatenAtMs routes to FORTRESS (the zone showed life after its
 *   last consumption) instead of DEPLETED.
 * - The fortress flip: 4+ defenses with zero sweeps -> FORTRESS (no-SWEEP law).
 * - PASS_THROUGH (body close through) -> BROKEN from any live state.
 * - ZFP_MEASURED records lastZfp without moving state (the projector reads).
 *
 * No wall-clock in core: every timestamp arrives on the event (atMs).
 * Context carries tf + defenseCount + lastZfp beyond the skeleton — the guards
 * cannot be computed without them (documented seam, not drift).
 */

import { assign, createActor, setup } from "xstate"
import type { ActorRefFrom } from "xstate"
import type { PressureState, TimeframeKey, TouchKind } from "../core/types.ts"

export interface PressureContext {
  zoneId: string
  tf: TimeframeKey | null
  reactionCount: number
  defenseCount: number
  defendedAtMs: number | null
  eatenAtMs: number | null
  lastZfp: number | null
  state: PressureState
}

export type PressureEvent =
  | { type: "BATTLE_RESOLVED"; touchKind: TouchKind; atMs: number }
  | { type: "ZFP_MEASURED"; value: number }

export interface PressureInput {
  zoneId: string
  tf?: TimeframeKey
}

function asBattle(event: PressureEvent): { touchKind: TouchKind; atMs: number } | null {
  if (event.type !== "BATTLE_RESOLVED") return null
  const e = event as { touchKind?: unknown; atMs?: unknown }
  if (typeof e.atMs !== "number" || !Number.isFinite(e.atMs)) return null
  const kinds: TouchKind[] = ["SWEEP", "WICK_REJECT", "BODY_DEFEND", "CONSOL_DWELL", "PASS_THROUGH"]
  if (!kinds.includes(e.touchKind as TouchKind)) return null
  return { touchKind: e.touchKind as TouchKind, atMs: e.atMs }
}

const isSweep = (event: PressureEvent): boolean =>
  asBattle(event)?.touchKind === "SWEEP"

const isPass = (event: PressureEvent): boolean =>
  asBattle(event)?.touchKind === "PASS_THROUGH"

const isDefense = (event: PressureEvent): boolean => {
  const b = asBattle(event)
  return b !== null && b.touchKind !== "SWEEP" && b.touchKind !== "PASS_THROUGH"
}

/** 4H zones never die (the death-scope law: DEATH_SCOPE_TFS = 30m/1H only). */
const is4Hzone = (context: PressureContext): boolean => context.tf === "4H"

/** 4th defense while virgin (zero sweeps) -> the fortress flip. */
const flipsFortress = (context: PressureContext, event: PressureEvent): boolean =>
  isDefense(event) && context.reactionCount === 0 && context.defenseCount + 1 >= 4

/**
 * The fortress override: the zone defended AFTER its last consumption, so the
 * killing sweep finds a live defense newer than the prior eaten mark.
 * Evaluated against the PRE-update eatenAtMs (the current context).
 */
const fortressOverridesDeath = (context: PressureContext, event: PressureEvent): boolean => {
  if (!isSweep(event)) return false
  if (context.defendedAtMs === null) return false
  if (context.eatenAtMs === null) return true
  return context.defendedAtMs > context.eatenAtMs
}

/** 3rd sweep on a non-4H zone with no live-defense override -> death. */
const diesOnSweep = (context: PressureContext, event: PressureEvent): boolean =>
  isSweep(event) &&
  !is4Hzone(context) &&
  !fortressOverridesDeath(context, event) &&
  context.reactionCount + 1 >= 3

export const pressureMachine = setup({
  types: {
    context: {} as PressureContext,
    events: {} as PressureEvent,
    input: {} as PressureInput,
  },
  guards: {
    isSweepBattle: ({ event }: { event: PressureEvent }) => isSweep(event),
    isPassThrough: ({ event }: { event: PressureEvent }) => isPass(event),
    isDefenseBattle: ({ event }: { event: PressureEvent }) => isDefense(event),
    flipsFortress: ({ context, event }: { context: PressureContext; event: PressureEvent }) =>
      flipsFortress(context, event),
    is4H: ({ context }: { context: PressureContext }) => is4Hzone(context),
    fortressOverridesDeath: ({ context, event }: { context: PressureContext; event: PressureEvent }) =>
      fortressOverridesDeath(context, event),
    /** 3rd sweep on a non-4H zone with no live-defense override -> death. */
    diesOnSweep: ({ context, event }: { context: PressureContext; event: PressureEvent }) =>
      diesOnSweep(context, event),
  },
  actions: {
    recordSweep: assign({
      reactionCount: ({ context, event }) => (isSweep(event) ? context.reactionCount + 1 : context.reactionCount),
      eatenAtMs: ({ context, event }) => asBattle(event)?.atMs ?? context.eatenAtMs,
    }),
    recordDefense: assign({
      defenseCount: ({ context, event }) => (isDefense(event) ? context.defenseCount + 1 : context.defenseCount),
      defendedAtMs: ({ context, event }) => asBattle(event)?.atMs ?? context.defendedAtMs,
    }),
    recordZfp: assign({
      lastZfp: ({ context, event }) =>
        event.type === "ZFP_MEASURED" && Number.isFinite(event.value) ? event.value : context.lastZfp,
    }),
  },
}).createMachine({
  id: "zonePressure",
  initial: "VIRGIN",
  context: ({ input }: { input: PressureInput }): PressureContext => ({
    zoneId: input.zoneId,
    tf: input.tf ?? null,
    reactionCount: 0,
    defenseCount: 0,
    defendedAtMs: null,
    eatenAtMs: null,
    lastZfp: null,
    state: "VIRGIN",
  }),
  states: {
    VIRGIN: {
      entry: assign({ state: "VIRGIN" as PressureState }),
      on: {
        BATTLE_RESOLVED: [
          { target: "BROKEN", guard: "isPassThrough", actions: "recordSweep" },
          { target: "FORTRESS", guard: "flipsFortress", actions: "recordDefense" },
          { target: "ACTIVE_1", guard: "isSweepBattle", actions: "recordSweep" },
          { actions: "recordDefense", guard: "isDefenseBattle" },
        ],
        ZFP_MEASURED: { actions: "recordZfp" },
      },
    },
    ACTIVE_1: {
      entry: assign({ state: "ACTIVE_1" as PressureState }),
      on: {
        BATTLE_RESOLVED: [
          { target: "BROKEN", guard: "isPassThrough", actions: "recordSweep" },
          { target: "ACTIVE_2", guard: "isSweepBattle", actions: "recordSweep" },
          { actions: "recordDefense", guard: "isDefenseBattle" },
        ],
        ZFP_MEASURED: { actions: "recordZfp" },
      },
    },
    ACTIVE_2: {
      entry: assign({ state: "ACTIVE_2" as PressureState }),
      on: {
        BATTLE_RESOLVED: [
          { target: "BROKEN", guard: "isPassThrough", actions: "recordSweep" },
          { target: "FORTRESS", guard: "fortressOverridesDeath", actions: "recordSweep" },
          { target: "DEPLETED", guard: "diesOnSweep", actions: "recordSweep" },
          { guard: "isSweepBattle", actions: "recordSweep" },
          { actions: "recordDefense", guard: "isDefenseBattle" },
        ],
        ZFP_MEASURED: { actions: "recordZfp" },
      },
    },
    DEPLETED: {
      entry: assign({ state: "DEPLETED" as PressureState }),
      on: {
        BATTLE_RESOLVED: [
          { actions: "recordDefense", guard: "isDefenseBattle" },
          { actions: "recordSweep" },
        ],
        ZFP_MEASURED: { actions: "recordZfp" },
      },
    },
    FORTRESS: {
      entry: assign({ state: "FORTRESS" as PressureState }),
      on: {
        BATTLE_RESOLVED: [
          { target: "BROKEN", guard: "isPassThrough", actions: "recordSweep" },
          { actions: "recordDefense", guard: "isDefenseBattle" },
          { actions: "recordSweep" },
        ],
        ZFP_MEASURED: { actions: "recordZfp" },
      },
    },
    BROKEN: {
      entry: assign({ state: "BROKEN" as PressureState }),
      on: {
        BATTLE_RESOLVED: [
          { actions: "recordDefense", guard: "isDefenseBattle" },
          { actions: "recordSweep" },
        ],
        ZFP_MEASURED: { actions: "recordZfp" },
      },
    },
  },
})

export type PressureActor = ActorRefFrom<typeof pressureMachine>

export function createPressureActor(zoneId: string, tf?: TimeframeKey): PressureActor {
  return createActor(pressureMachine, { input: { zoneId, tf } })
}
