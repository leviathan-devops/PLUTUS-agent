// src/e2/machines/cascade-machine.ts — B.W3.3 (spec lines 1004-1024) + S-1 B-4/B-5/B-6.
// Built on the LANDED ms-chain-tracker semantics: REQUIRES (EU advances only
// after the DXY-inverse EXISTS), FORBIDS (GU never consumes raw DXY — reads
// ACTIVE EU mirrors only), detectLoop (same translation re-firing = duplicate
// KILL + stage-id recorded). Per-stage ChainRule violations carry
// { stage: dxy-e2|eu-e2-cascade|eu-e2-core|gu-e2 }.

import type { MachineDefinition, MachineRecordBase, WarheadEvent } from "../../substrate/L3-lasme/index";
import { withTriad } from "../../substrate/L3-lasme/index";
import { ChainTracker } from "../../substrate/microstructures/ms-chain-tracker/src/core/engine";
import type { ChainRule, ChainViolation } from "../../substrate/microstructures/ms-chain-tracker/src/core/types";
import { ev, violation, type CascadeStage } from "./types";

export type CascadeState = "IDLE" | "DXY_DONE" | "EU_CASCADE" | "EU_CORE" | "GU_DONE";
export const CASCADE_MACHINE_ID = "cascade";
const HERE = "src/e2/machines/cascade-machine.ts";

export interface CascadeRecord extends MachineRecordBase {
  readonly dxyInverseExists: boolean;
  readonly activeEuMirrors: readonly string[];
  readonly killedDuplicates: readonly string[];
  readonly lastStage: CascadeStage | null;
}

export function freshCascade(): CascadeRecord {
  return { machineId: CASCADE_MACHINE_ID, state: "IDLE", seq: 0, triads: [], dxyInverseExists: false, activeEuMirrors: [], killedDuplicates: [], lastStage: null };
}

function strField(e: WarheadEvent, key: string): string | null {
  const v = (e.payload as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** The per-stage ChainRule set — every violation carries its stage (B.W3.3 lines 1021-1023). */
export function chainRulesFor(stage: CascadeStage): ChainRule[] {
  const base = {
    dxy: { name: "dxy-e2-sequence", description: "DXY E2 completes first (S-1 B-4)", violation: { layerId: "dxy-e2" } },
    euCascade: { name: "eu-e2-cascade-requires", description: "EU cascade requires the DXY-inverse (S-1 B-4)", requires: [{ tool: "dxy-e2-designate" }], violation: { layerId: "eu-e2-cascade" } },
    euCore: { name: "eu-e2-core-requires", description: "EU core requires the EU cascade (S-1 B-4)", requires: [{ tool: "eu-e2-cascade-designate" }], violation: { layerId: "eu-e2-core" } },
    gu: { name: "gu-e2-forbids-raw-dxy", description: "GU never consumes raw DXY (S-1 B-5)", requires: [{ tool: "eu-e2-core-designate" }], forbids: [{ tool: "dxy-raw-consume" }], violation: { layerId: "gu-e2" } },
  };
  switch (stage) {
    case "dxy-e2": return [base.dxy];
    case "eu-e2-cascade": return [base.euCascade];
    case "eu-e2-core": return [base.euCore];
    case "gu-e2": return [base.gu];
  }
}

export interface StagedViolation extends ChainViolation {
  stage: CascadeStage;
}

export function withStage(v: ChainViolation, stage: CascadeStage): StagedViolation {
  return { ...v, stage };
}

export const cascadeMachine: MachineDefinition<CascadeState, CascadeRecord> = {
  machineId: CASCADE_MACHINE_ID,
  states: ["IDLE", "DXY_DONE", "EU_CASCADE", "EU_CORE", "GU_DONE"],
  initial: "IDLE",
  // ORDER IS LOAD-BEARING: the cascade advances DXY -> EU-cascade -> EU-core -> GU, never skipping.
  transitions: [
    { id: "dxy-designated", event: "DXY_DESIGNATED", from: ["IDLE"], to: "DXY_DONE",
      guard: (_r, e) => (strField(e, "designationId") === null
        ? { allowed: false, reason: "DXY_DESIGNATED malformed: designationId required" }
        : { allowed: true }),
      apply: (r, e) => ({ ...withTriad({ ...r }, e), dxyInverseExists: true, lastStage: "dxy-e2" } as CascadeRecord) },
    { id: "eu-cascade-designated", event: "EU_CASCADE_DESIGNATED", from: ["DXY_DONE"], to: "EU_CASCADE",
      // S-1 B-4 REQUIRES: EU cannot advance before the DXY-inverse designation EXISTS.
      guard: (r, e) => {
        if (strField(e, "designationId") === null) return { allowed: false, reason: "EU_CASCADE_DESIGNATED malformed: designationId required" };
        if (!r.dxyInverseExists) return { allowed: false, reason: "MISSING_PREREQUISITE: EU cascade requires the DXY-inverse designation (S-1 B-4)" };
        return { allowed: true };
      },
      apply: (r, e) => {
        const id = strField(e, "designationId") as string;
        return { ...withTriad({ ...r }, e), activeEuMirrors: [...r.activeEuMirrors, id], lastStage: "eu-e2-cascade" } as CascadeRecord;
      } },
    { id: "eu-core-designated", event: "EU_CORE_DESIGNATED", from: ["EU_CASCADE"], to: "EU_CORE",
      guard: (r, e) => {
        if (strField(e, "designationId") === null) return { allowed: false, reason: "EU_CORE_DESIGNATED malformed: designationId required" };
        if (r.activeEuMirrors.length === 0) return { allowed: false, reason: "MISSING_PREREQUISITE: EU core requires the EU cascade mirrors" };
        return { allowed: true };
      },
      apply: (r, e) => {
        const id = strField(e, "designationId") as string;
        return { ...withTriad({ ...r }, e), activeEuMirrors: [...r.activeEuMirrors, id], lastStage: "eu-e2-core" } as CascadeRecord;
      } },
    { id: "gu-designated", event: "GU_DESIGNATED", from: ["EU_CORE"], to: "GU_DONE",
      // S-1 B-5 FORBIDS: GU reads ACTIVE EU mirrors only — rawDxyZoneId present = block.
      guard: (r, e) => {
        const p = e.payload as Record<string, unknown>;
        if (strField(e, "designationId") === null) return { allowed: false, reason: "GU_DESIGNATED malformed: designationId required" };
        if (typeof p["rawDxyZoneId"] === "string" && (p["rawDxyZoneId"] as string).length > 0) {
          return { allowed: false, reason: `FORBIDDEN_PRECEDENT: GU lane never consumes raw DXY setups (got ${p["rawDxyZoneId"]}) — read ACTIVE EU mirrors only (S-1 B-5)` };
        }
        const mirrorId = p["euMirrorId"];
        if (typeof mirrorId !== "string" || !r.activeEuMirrors.includes(mirrorId)) {
          return { allowed: false, reason: "MISSING_PREREQUISITE: GU designation must reference an ACTIVE EU mirror" };
        }
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), lastStage: "gu-e2" } as CascadeRecord) },
  ],
};

/**
 * detectLoop (S-1 B-6): the same translation re-firing = duplicate KILL +
 * the stage-id recorded. Backed by the LANDED ChainTracker.detectLoop.
 */
export class CascadeLoopGuard {
  private readonly tracker = new ChainTracker();
  private readonly seen = new Map<string, CascadeStage>();
  private readonly session: string;

  constructor(sessionId: string) {
    if (typeof sessionId !== "string" || sessionId.length === 0) throw violation("CASCADE_BAD_SESSION", "sessionId must be non-empty");
    this.session = sessionId;
  }

  /**
   * Note a translation firing. Returns { killed: true } when this SAME
   * translation already fired (the 40-duplicate class) — the caller must NOT
   * advance the cascade on a killed translation.
   */
  noteTranslation(translationId: string, stage: CascadeStage): { killed: boolean; stageId: CascadeStage } {
    if (typeof translationId !== "string" || translationId.length === 0) throw violation("CASCADE_BAD_TRANSLATION", "translationId must be non-empty");
    const prior = this.seen.get(translationId);
    if (prior !== undefined) {
      this.tracker.recordCall(this.session, `translation:${translationId}`, { stage });
      this.tracker.recordResult(this.session, `translation:${translationId}`, 0, `duplicate-of:${prior}`);
      return { killed: true, stageId: prior };
    }
    this.seen.set(translationId, stage);
    this.tracker.recordCall(this.session, `translation:${translationId}`, { stage });
    this.tracker.recordResult(this.session, `translation:${translationId}`, 0, `advanced:${stage}`);
    return { killed: false, stageId: stage };
  }

  /** The tracker's own loop signal over the recent translation window. */
  get loopDetected(): boolean {
    try {
      return this.tracker.detectLoop(this.session);
    } catch (e) {
      void e;
      return false;
    }
  }

  /** Evaluate the per-stage ChainRules against the tracker's history. */
  evaluate(stage: CascadeStage, currentTool: string, args: Record<string, unknown>): StagedViolation[] {
    return this.tracker.evaluateRules(this.session, currentTool, args, chainRulesFor(stage)).map((v) => withStage(v, stage));
  }

  recordTool(tool: string, args: Record<string, unknown>): void {
    this.tracker.recordCall(this.session, tool, args);
  }
}

export function cascadeEvent(type: "DXY_DESIGNATED" | "EU_CASCADE_DESIGNATED" | "EU_CORE_DESIGNATED" | "GU_DESIGNATED", from: CascadeState, fields: Record<string, unknown>): WarheadEvent {
  const to: Record<string, CascadeState> = { DXY_DESIGNATED: "DXY_DONE", EU_CASCADE_DESIGNATED: "EU_CASCADE", EU_CORE_DESIGNATED: "EU_CORE", GU_DESIGNATED: "GU_DONE" };
  return ev(type, fields, CASCADE_MACHINE_ID, from, to[type] as string, `cascade:${type}`, HERE, 60);
}
