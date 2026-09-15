/**
 * e1Container — the E1 data grouping (spec B.W2.4: "the container IS data").
 *
 * The container groups the running actors with the engines for the adapter
 * layer. It owns NO runtime of its own: no start/stop/tick, no clock, no
 * transitions. Starting actors is the CALLER's act (side effects precede
 * claims — the container never pretends to run what it only holds).
 */

import { createActor } from "xstate"
import type { LexiconRegistry } from "../core/engine.ts"
import type { TimeframeKey } from "../core/types.ts"
import type { OBCVEngine } from "../adapters/obcv-engine.ts"
import { pressureMachine, type PressureActor } from "./pressure-actor.ts"
import { createZoneMapActor, type ZoneMapActor } from "./zone-map-actor.ts"

export interface E1Container {
  zoneMapActor: ZoneMapActor
  pressureActors: Map<string, PressureActor>
  lmEngine: LexiconRegistry | null
  obcvEngine: OBCVEngine | null
}

export function createE1Container(opts?: {
  lmEngine?: LexiconRegistry
  obcvEngine?: OBCVEngine
}): E1Container {
  return {
    zoneMapActor: createZoneMapActor(),
    pressureActors: new Map(),
    lmEngine: opts?.lmEngine ?? null,
    obcvEngine: opts?.obcvEngine ?? null,
  }
}

/**
 * actorForZone — memoised per-zone pressure actor. Creates on first call,
 * returns the SAME actor afterwards (one lifecycle per zone, never forked).
 * The actor is created STOPPED; the caller starts it.
 */
export function actorForZone(
  container: E1Container,
  zoneId: string,
  tf?: TimeframeKey,
): PressureActor {
  const existing = container.pressureActors.get(zoneId)
  if (existing) return existing
  const actor = createActor(pressureMachine, { input: { zoneId, tf } })
  container.pressureActors.set(zoneId, actor)
  return actor
}
