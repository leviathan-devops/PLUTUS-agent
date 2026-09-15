// src/e2/machines/shape-chain-machine.ts — B.W3.1 (spec lines 946-976).
// States SS|BS|R|WL|RWL|WLS|PBS; the ZFP-conditioned guards; the unified macro
// authority (contradiction -> INCONCLUSIVE + chainsContradict EVIDENCE); the
// forward-probability matrix over the E1 evidence.

import type { MachineDefinition, MachineRecordBase, TransitionSpec, WarheadEvent } from "../../substrate/L3-lasme/index";
import { withTriad } from "../../substrate/L3-lasme/index";
import {
  DIVERGENCE_MAX, ZFP_BS_R_HI, ZFP_BS_R_LO, ZFP_SS_BS_MIN,
  chainsContradictTriad, ev,
  violation,
  type EvidenceTriad, type PairKey,
} from "./types";

export type ShapeState = "SS" | "BS" | "R" | "WL" | "RWL" | "WLS" | "PBS";
export const SHAPE_MACHINE_ID = "shape-chain";
const HERE = "src/e2/machines/shape-chain-machine.ts";

export interface ShapeRecord extends MachineRecordBase {
  readonly pair: PairKey;
  readonly macroShape: ShapeState | null;
  readonly divergence: number;
  readonly lastTouchKind: string | null;
  readonly lastZfp: number | null;
}

export function freshShape(pair: PairKey): ShapeRecord {
  if (pair !== "DXY" && pair !== "EUR/USD" && pair !== "GBP/USD") throw violation("SHAPE_BAD_PAIR", `unknown pair: ${String(pair)}`);
  return { machineId: SHAPE_MACHINE_ID, state: "SS", seq: 0, triads: [], pair, macroShape: null, divergence: 0, lastTouchKind: null, lastZfp: null };
}

interface DayOpen {
  zfp: number; marubozuAnatomy: boolean; consolidationReversal: boolean;
  opposingBom: boolean; sweepComplete: boolean; recoveryToStructure: boolean;
  consolidationPhase: boolean; reverseContinuation: boolean; nyResolution: "SS" | "BS" | null;
  macroShape: ShapeState | null; divergence: number;
}

function dayOpen(e: WarheadEvent): DayOpen | null {
  const p = e.payload as Record<string, unknown>;
  if (typeof p["zfp"] !== "number" || !Number.isFinite(p["zfp"])) return null;
  return {
    zfp: p["zfp"] as number,
    marubozuAnatomy: p["marubozuAnatomy"] === true,
    consolidationReversal: p["consolidationReversal"] === true,
    opposingBom: p["opposingBom"] === true,
    sweepComplete: p["sweepComplete"] === true,
    recoveryToStructure: p["recoveryToStructure"] === true,
    consolidationPhase: p["consolidationPhase"] === true,
    reverseContinuation: p["reverseContinuation"] === true,
    nyResolution: p["nyResolution"] === "SS" || p["nyResolution"] === "BS" ? p["nyResolution"] : null,
    macroShape: typeof p["macroShape"] === "string" ? (p["macroShape"] as ShapeState) : null,
    divergence: typeof p["divergence"] === "number" ? (p["divergence"] as number) : 0,
  };
}

/**
 * The macro authority guard (B.W3.1 lines 966-969): fires on EVERY DAY_OPEN
 * transition. Contradiction -> guard refuses with a chainsContradict reason —
 * the caller records EVIDENCE and reports INCONCLUSIVE (never silent, never suppress).
 */
export function macroContradicts(d: DayOpen, target: ShapeState): boolean {
  if (d.macroShape === null) return false;
  return d.macroShape !== target && d.divergence > DIVERGENCE_MAX;
}

export type Inconclusive = { kind: "INCONCLUSIVE"; evidence: EvidenceTriad; reason: string };

function dayGuard(target: ShapeState, local: (d: DayOpen) => { ok: boolean; why: string }) {
  return (r: ShapeRecord, e: WarheadEvent) => {
    void r;
    const d = dayOpen(e);
    if (d === null) return { allowed: false, reason: "DAY_OPEN malformed: zfp numeric required" };
    if (macroContradicts(d, target)) {
      return { allowed: false, reason: `chainsContradict: macro=${d.macroShape} target=${target} divergence=${d.divergence} — INCONCLUSIVE, evidence recorded` };
    }
    const v = local(d);
    return v.ok ? { allowed: true } : { allowed: false, reason: v.why };
  };
}

function dayApply(target: ShapeState) {
  return (r: ShapeRecord, e: WarheadEvent) => {
    const d = dayOpen(e);
    const withT = withTriad({ ...r }, e);
    return {
      ...withT,
      macroShape: d?.macroShape ?? r.macroShape,
      divergence: d?.divergence ?? r.divergence,
      lastZfp: d?.zfp ?? r.lastZfp,
      state: target,
    } as ShapeRecord;
  };
}

// ORDER IS LOAD-BEARING: first match wins (transition order encodes doctrine precedence).
const dayTable: Array<TransitionSpec<ShapeState, ShapeRecord>> = [
  { id: "ss-to-bs", event: "DAY_OPEN", from: ["SS"], to: "BS",
    guard: dayGuard("BS", (d) => ({ ok: d.zfp > ZFP_SS_BS_MIN && d.marubozuAnatomy, why: `ssToBs needs zfp>${ZFP_SS_BS_MIN} + marubozu (got zfp=${d.zfp} marubozu=${d.marubozuAnatomy})` })),
    apply: dayApply("BS") },
  { id: "ss-to-r", event: "DAY_OPEN", from: ["SS"], to: "R",
    guard: dayGuard("R", (d) => ({ ok: d.consolidationReversal, why: "ssToR needs the consolidation reversal" })),
    apply: dayApply("R") },
  { id: "bs-to-r", event: "DAY_OPEN", from: ["BS"], to: "R",
    guard: dayGuard("R", (d) => ({ ok: d.zfp >= ZFP_BS_R_LO && d.zfp <= ZFP_BS_R_HI, why: `bsToR needs zfp in [${ZFP_BS_R_LO},${ZFP_BS_R_HI}] (got ${d.zfp})` })),
    apply: dayApply("R") },
  { id: "bs-to-rwl", event: "DAY_OPEN", from: ["BS"], to: "RWL",
    guard: dayGuard("RWL", (d) => ({ ok: d.opposingBom && d.sweepComplete, why: `bsToRWL needs opposing-BoM + sweep complete (got bom=${d.opposingBom} sweep=${d.sweepComplete})` })),
    apply: dayApply("RWL") },
  { id: "r-to-wl", event: "DAY_OPEN", from: ["R"], to: "WL",
    guard: dayGuard("WL", (d) => ({ ok: d.recoveryToStructure, why: "rToWL needs the recovery reaching opposing structure" })),
    apply: dayApply("WL") },
  { id: "wl-to-ss", event: "DAY_OPEN", from: ["WL"], to: "SS",
    guard: dayGuard("SS", (d) => ({ ok: d.consolidationPhase, why: "wlToSS needs the consolidation phase" })),
    apply: dayApply("SS") },
  { id: "rwl-to-bs", event: "DAY_OPEN", from: ["RWL"], to: "BS",
    guard: dayGuard("BS", (d) => ({ ok: d.reverseContinuation, why: "rwlToBS needs the reverse continuation" })),
    apply: dayApply("BS") },
  { id: "wls-resolve-ss", event: "DAY_OPEN", from: ["WLS"], to: "SS",
    guard: dayGuard("SS", (d) => ({ ok: d.nyResolution === "SS", why: `wlsResolution needs the NY session deciding SS (got ${String(d.nyResolution)})` })),
    apply: dayApply("SS") },
  { id: "wls-resolve-bs", event: "DAY_OPEN", from: ["WLS"], to: "BS",
    guard: dayGuard("BS", (d) => ({ ok: d.nyResolution === "BS", why: `wlsResolution needs the NY session deciding BS (got ${String(d.nyResolution)})` })),
    apply: dayApply("BS") },
  // NOTE: PBS has no outgoing DAY_OPEN edge in the B.W3.1 table — it is a terminal
  // shape in this wave. The recording loops below still cover it. The table's
  // silence on PBS is REPORTED, never papered over.
];

const ALL_SHAPES: readonly ShapeState[] = ["SS", "BS", "R", "WL", "RWL", "WLS", "PBS"];

// Recording self-loops: BATTLE_RESOLVED / ZFP_MEASURED advance the EVIDENCE (I2),
// never the shape — the shape moves on DAY_OPEN only. One loop per state.
function battleLoop(state: ShapeState): TransitionSpec<ShapeState, ShapeRecord> {
  return {
    id: `battle-resolved-${state}`, event: "BATTLE_RESOLVED", from: [state], to: state,
    guard: (_r, e) => {
      const p = e.payload as Record<string, unknown>;
      if (typeof p["zoneId"] !== "string" || typeof p["touchKind"] !== "string") {
        return { allowed: false, reason: "BATTLE_RESOLVED malformed: zoneId + touchKind required" };
      }
      return { allowed: true };
    },
    apply: (r, e) => {
      const p = e.payload as Record<string, unknown>;
      return { ...withTriad({ ...r }, e), lastTouchKind: p["touchKind"] as string } as ShapeRecord;
    },
  };
}

function zfpLoop(state: ShapeState): TransitionSpec<ShapeState, ShapeRecord> {
  return {
    id: `zfp-measured-${state}`, event: "ZFP_MEASURED", from: [state], to: state,
    guard: (_r, e) => {
      const p = e.payload as Record<string, unknown>;
      if (typeof p["zoneId"] !== "string" || typeof p["value"] !== "number" || !Number.isFinite(p["value"])) {
        return { allowed: false, reason: "ZFP_MEASURED malformed: zoneId + numeric value required" };
      }
      return { allowed: true };
    },
    apply: (r, e) => {
      const p = e.payload as Record<string, unknown>;
      return { ...withTriad({ ...r }, e), lastZfp: p["value"] as number } as ShapeRecord;
    },
  };
}

export const shapeChainMachine: MachineDefinition<ShapeState, ShapeRecord> = {
  machineId: SHAPE_MACHINE_ID,
  states: ["SS", "BS", "R", "WL", "RWL", "WLS", "PBS"],
  initial: "SS",
  transitions: [
    ...dayTable,
    ...ALL_SHAPES.map(battleLoop),
    ...ALL_SHAPES.map(zfpLoop),
  ],
  invariants: [
    (r) => ({ ok: (ALL_SHAPES as readonly string[]).includes(r.state), invariantId: "I_SHAPE_CLOSED_SET" }),
    (r) => ({ ok: r.divergence >= 0 && r.divergence <= 1, invariantId: "I_DIVERGENCE_RANGE" }),
  ],
};

/** Build the DAY_OPEN event carrying the E1 evidence + the I2 triad. */
export function dayOpenEvent(from: ShapeState, fields: Record<string, unknown>): WarheadEvent {
  return ev("DAY_OPEN", fields, SHAPE_MACHINE_ID, from, "?", `shape-guard:${from}`, HERE, 150);
}

/** chainsContradict evidence for an INCONCLUSIVE transition (call when the guard refuses on macro grounds). */
export function contradictEvidence(r: ShapeRecord, target: ShapeState, macro: string, divergence: number): Inconclusive {
  return {
    kind: "INCONCLUSIVE",
    evidence: chainsContradictTriad(SHAPE_MACHINE_ID, r.state, target, r.pair, macro, divergence, HERE, 66),
    reason: `chainsContradict: ${r.pair} -> ${target} contradicts macro ${macro} at divergence ${divergence} — recorded, never suppressed`,
  };
}

/**
 * The forward-probability matrix (B.W3.1 lines 971-975):
 * P(S->S') = guards-fired / all-guards over the E1 evidence.
 * Macro-INCONCLUSIVE candidates are excluded from the mass (never silent: they
 * are returned in the `inconclusive` list with their evidence reason).
 */
export function forwardProbabilities(
  record: ShapeRecord,
  evidence: Record<string, unknown>,
): { probs: Array<{ from: ShapeState; to: ShapeState; p: number }>; inconclusive: Array<{ from: ShapeState; to: ShapeState; reason: string }> } {
  const probs: Array<{ from: ShapeState; to: ShapeState; p: number }> = [];
  const inconclusive: Array<{ from: ShapeState; to: ShapeState; reason: string }> = [];
  for (const from of ALL_SHAPES) {
    if (from === "PBS") continue;
    const cands = dayTable.filter((t) => t.from?.includes(from));
    if (cands.length === 0) continue;
    let fired = 0;
    const rows = cands.map((t) => {
      const probe = { ...record, state: from } as ShapeRecord;
      const e = ev("DAY_OPEN", evidence, SHAPE_MACHINE_ID, from, t.to, `prob:${t.id}`, HERE, 175);
      const g = t.guard(probe, e);
      const macro = typeof g.reason === "string" && g.reason.startsWith("chainsContradict");
      if (macro) inconclusive.push({ from, to: t.to, reason: g.reason ?? "chainsContradict" });
      if (g.allowed) fired += 1;
      return { to: t.to, fired: g.allowed, macro };
    });
    const denom = rows.filter((x) => !x.macro).length;
    for (const x of rows) {
      if (x.macro) continue;
      probs.push({ from, to: x.to, p: denom === 0 ? 0 : fired / denom });
    }
  }
  return { probs, inconclusive };
}
