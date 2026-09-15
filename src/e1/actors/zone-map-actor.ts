/**
 * zoneMapActor — the running E1 zone map (XState v5 projector, spec B.W2.4).
 *
 * Shape authority: PLUTUS_V5_FULL_BUILD_SPEC.md §B.W2.4 (lines ~865-898).
 * Holds context { zones: Map, rungs: Map, verdicts: [] } across states
 * empty -> populating -> finalized on events ZONE_ADDED / ZONE_UPDATED /
 * PRESSURE_CHANGED / FINALIZE.
 *
 * EXTENSIONS beyond the skeleton (documented seams, not drift):
 * - VERDICT_RECORDED event: the skeleton's context carries verdicts[] but no
 *   event fills it; without this the field is write-only theater.
 * - Invalid payloads are refused by guards (hasValidZone / hasZoneId): an
 *   actor that corrupts its map on a malformed event is a defect.
 * - ZONE_ADDED is an upsert: re-adding an existing id replaces it (the
 *   adapter re-emits zones per timeframe pass; duplicates must not fork).
 */

import { assign, createActor, setup } from "xstate"
import type { ActorRefFrom } from "xstate"
import type { PressureState, Rung, ZoneModel } from "../core/types.ts"

export interface LexiconVerdict {
  pattern: string
  state: string
  evidence: { file: string; line: number; quote: string }
}

export interface ZoneMapContext {
  zones: Map<string, ZoneModel>
  rungs: Map<string, Rung>
  verdicts: LexiconVerdict[]
}

export type ZoneMapEvent =
  | { type: "ZONE_ADDED"; zone: ZoneModel }
  | { type: "ZONE_UPDATED"; zone: ZoneModel }
  | { type: "PRESSURE_CHANGED"; zoneId: string; pressure: PressureState }
  | { type: "VERDICT_RECORDED"; verdict: LexiconVerdict }
  | { type: "FINALIZE" }

export interface ZoneMapSnapshot {
  zones: ZoneModel[]
  rungs: Rung[]
  verdicts: LexiconVerdict[]
}

function isZoneModel(v: unknown): v is ZoneModel {
  if (typeof v !== "object" || v === null) return false
  const z = v as Record<string, unknown>
  return (
    typeof z["id"] === "string" &&
    (z["type"] === "DEMAND" || z["type"] === "SUPPLY") &&
    typeof z["top"] === "number" &&
    Number.isFinite(z["top"]) &&
    typeof z["bottom"] === "number" &&
    Number.isFinite(z["bottom"])
  )
}

function upsertZone(zones: Map<string, ZoneModel>, zone: ZoneModel): Map<string, ZoneModel> {
  const next = new Map(zones)
  next.set(zone.id, zone)
  return next
}

export const zoneMapMachine = setup({
  types: {
    context: {} as ZoneMapContext,
    events: {} as ZoneMapEvent,
  },
  guards: {
    hasValidZone: ({ event }: { event: ZoneMapEvent }) =>
      (event.type === "ZONE_ADDED" || event.type === "ZONE_UPDATED") &&
      isZoneModel((event as { zone?: unknown }).zone),
    hasZoneId: ({ event }: { event: ZoneMapEvent }) =>
      event.type === "PRESSURE_CHANGED" && typeof (event as { zoneId?: unknown }).zoneId === "string",
    hasVerdict: ({ event }: { event: ZoneMapEvent }) => {
      if (event.type !== "VERDICT_RECORDED") return false
      const v = (event as { verdict?: unknown }).verdict as Record<string, unknown> | undefined
      return (
        typeof v === "object" &&
        v !== null &&
        typeof v["pattern"] === "string" &&
        typeof v["state"] === "string"
      )
    },
  },
  actions: {
    addZone: assign({
      zones: ({ context, event }) => {
        if (event.type !== "ZONE_ADDED" && event.type !== "ZONE_UPDATED") return context.zones
        return upsertZone(context.zones, event.zone)
      },
    }),
    updatePressure: assign({
      zones: ({ context, event }) => {
        if (event.type !== "PRESSURE_CHANGED") return context.zones
        const current = context.zones.get(event.zoneId)
        if (!current) return context.zones
        return upsertZone(context.zones, { ...current, pressure: event.pressure })
      },
    }),
    recordVerdict: assign({
      verdicts: ({ context, event }) => {
        if (event.type !== "VERDICT_RECORDED") return context.verdicts
        return [...context.verdicts, event.verdict]
      },
    }),
  },
}).createMachine({
  id: "zoneMap",
  initial: "empty",
  context: { zones: new Map(), rungs: new Map(), verdicts: [] },
  // Root output: snapshot.output carries the map once ANY final state is hit
  // (state-level output alone feeds only the done-event, not the snapshot).
  output: ({ context }: { context: ZoneMapContext }): ZoneMapSnapshot => ({
    zones: [...context.zones.values()],
    rungs: [...context.rungs.values()],
    verdicts: context.verdicts,
  }),
  states: {
    empty: {
      on: {
        ZONE_ADDED: { target: "populating", guard: "hasValidZone", actions: "addZone" },
      },
    },
    populating: {
      on: {
        ZONE_ADDED: { guard: "hasValidZone", actions: "addZone" },
        ZONE_UPDATED: { guard: "hasValidZone", actions: "addZone" },
        PRESSURE_CHANGED: { guard: "hasZoneId", actions: "updatePressure" },
        VERDICT_RECORDED: { guard: "hasVerdict", actions: "recordVerdict" },
        FINALIZE: "finalized",
      },
    },
    finalized: {
      type: "final",
      output: ({ context }: { context: ZoneMapContext }): ZoneMapSnapshot => ({
        zones: [...context.zones.values()],
        rungs: [...context.rungs.values()],
        verdicts: context.verdicts,
      }),
    },
  },
})

export type ZoneMapActor = ActorRefFrom<typeof zoneMapMachine>

export function createZoneMapActor(): ZoneMapActor {
  return createActor(zoneMapMachine)
}

/** Read the live snapshot from a running (non-finalized) or done actor. */
export function readZoneMapSnapshot(actor: ZoneMapActor): ZoneMapSnapshot {
  const snap = actor.getSnapshot()
  if (snap.status === "done") return snap.output as ZoneMapSnapshot
  const ctx = snap.context
  return {
    zones: [...ctx.zones.values()],
    rungs: [...ctx.rungs.values()],
    verdicts: ctx.verdicts,
  }
}
