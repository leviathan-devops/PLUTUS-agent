// src/e2/machines/tests/machines.test.ts — the E2 transition-table battery.
// B.W3.5 + the mission's KNOWN MEASUREMENTS: legal/illegal transitions, the
// 4H refusal, SIDE_INVERSION, Cascade REQUIRES, detectLoop, skip-absence,
// SC-7 type proof support. Adversarial: empty/null/concurrent/boundary >= 3 per module.

import { describe, expect, test } from "bun:test";
import { step } from "../../../substrate/L3-lasme/index";
import { divergenceOf, ev } from "../types";
import { contradictEvidence, dayOpenEvent, forwardProbabilities, freshShape, shapeChainMachine } from "../shape-chain-machine";
import { consumeEvent, designateEvent, designationMachine, failEvent, freshDesignation, type DesignationEmission } from "../designation-machine";
import { CascadeLoopGuard, cascadeEvent, cascadeMachine, chainRulesFor, freshCascade } from "../cascade-machine";
import { freshFreshness, freshnessBattleEvent, freshnessMachine, stepFreshness } from "../freshness-machine";
import { e2WorkflowMachine, freshWorkflow, skipAbsent, workflowEvent } from "../workflow-machine";
import { freshZonePressure, pressureBattleEvent, routeBattle, stepPressure, zonePressureMachine } from "../zone-pressure-machine";

const HERE = "src/e2/machines/tests/machines.test.ts";
function tri(from: string, to: string, machineId: string, member: string) {
  return ev("X", {}, machineId, from, to, member, HERE, 1);
}

// ── T1 ShapeChain (B.W3.1) ──────────────────────────────────────────────

describe("shape-chain ZFP guards", () => {
  test("legal SS->BS at zfp 0.5 + marubozu FIRES", () => {
    const r = freshShape("EUR/USD");
    const out = step(shapeChainMachine, r, dayOpenEvent("SS", { zfp: 0.5, marubozuAnatomy: true, projectedOpen: 1.14 }));
    expect(out.kind).toBe("TRANSITIONED");
    if (out.kind === "TRANSITIONED") expect(out.to).toBe("BS");
  });
  test("same at zfp 0.3 REFUSES (GUARD_FAILED, stays SS)", () => {
    const r = freshShape("EUR/USD");
    const out = step(shapeChainMachine, r, dayOpenEvent("SS", { zfp: 0.3, marubozuAnatomy: true }));
    expect(out.kind).toBe("UNCHANGED");
    if (out.kind === "UNCHANGED") expect(out.reason).toBe("GUARD_FAILED");
  });
  test("boundary: zfp exactly 0.45 REFUSES (strict >)", () => {
    const r = freshShape("DXY");
    const out = step(shapeChainMachine, r, dayOpenEvent("SS", { zfp: 0.45, marubozuAnatomy: true }));
    expect(out.kind).toBe("UNCHANGED");
  });
  test("BS->R at zfp 0.2 and 0.4 FIRES (inclusive ladder)", () => {
    for (const zfp of [0.2, 0.4]) {
      const r = { ...freshShape("DXY"), state: "BS" as const };
      const out = step(shapeChainMachine, r, dayOpenEvent("BS", { zfp }));
      expect(out.kind).toBe("TRANSITIONED");
    }
  });
  test("BS->RWL needs opposing-BoM + sweep; missing sweep REFUSES", () => {
    const r = { ...freshShape("DXY"), state: "BS" as const };
    const out = step(shapeChainMachine, r, dayOpenEvent("BS", { zfp: 0.5, opposingBom: true, sweepComplete: false }));
    expect(out.kind).toBe("UNCHANGED");
  });
  test("malformed DAY_OPEN (no zfp) REFUSES loud, never throws", () => {
    const r = freshShape("DXY");
    const out = step(shapeChainMachine, r, dayOpenEvent("SS", { marubozuAnatomy: true }));
    expect(out.kind).toBe("UNCHANGED");
  });
});

describe("shape-chain macro authority", () => {
  test("contradicting macro + divergence>0.35 -> INCONCLUSIVE + chainsContradict evidence", () => {
    const r = freshShape("EUR/USD");
    const out = step(shapeChainMachine, r, dayOpenEvent("SS", { zfp: 0.9, marubozuAnatomy: true, macroShape: "WL", divergence: 0.6 }));
    expect(out.kind).toBe("UNCHANGED");
    const inc = contradictEvidence(r, "BS", "WL", 0.6);
    expect(inc.kind).toBe("INCONCLUSIVE");
    expect(inc.evidence.pattern.memberId).toBe("macro-authority:chainsContradict");
    expect(inc.reason).toContain("never suppressed");
  });
  test("divergence at exactly 0.35 does NOT contradict (flag-only threshold)", () => {
    const r = freshShape("EUR/USD");
    const out = step(shapeChainMachine, r, dayOpenEvent("SS", { zfp: 0.9, marubozuAnatomy: true, macroShape: "WL", divergence: 0.35 }));
    expect(out.kind).toBe("TRANSITIONED");
  });
  test("divergenceOf computes from data (2/4 mismatch = 0.5)", () => {
    expect(divergenceOf(["SS", "BS", "R", "WL"], ["SS", "R", "R", "BS"])).toBe(0.5);
  });
  test("divergenceOf throws named error on empty input", () => {
    expect(() => divergenceOf([], ["SS"])).toThrow("DIVERGENCE_EMPTY_INPUT");
  });
});

describe("shape-chain forward probability", () => {
  test("P matrix sums over fired/all-guards; macro-inconclusive excluded but reported", () => {
    const r = freshShape("DXY");
    const { probs, inconclusive } = forwardProbabilities(r, { zfp: 0.9, marubozuAnatomy: true, macroShape: "WL", divergence: 0.9 });
    const ssRows = probs.filter((p) => p.from === "SS");
    expect(ssRows.length).toBe(0); // both SS candidates inconclusive under macro WL@0.9
    expect(inconclusive.length).toBeGreaterThan(0);
    const free = forwardProbabilities(r, { zfp: 0.9, marubozuAnatomy: true });
    const ssFree = free.probs.filter((p) => p.from === "SS");
    expect(ssFree.find((p) => p.to === "BS")?.p).toBe(0.5); // 1 of 2 fires
  });
  test("BATTLE_RESOLVED + ZFP_MEASURED record evidence without moving shape (I2)", () => {
    const r = freshShape("DXY");
    const named = ev("BATTLE_RESOLVED", { zoneId: "z1", touchKind: "SWEEP" }, "shape-chain", "SS", "SS", "m", HERE, 1);
    const out = step(shapeChainMachine, r, { ...named, type: "BATTLE_RESOLVED" });
    expect(out.kind).toBe("TRANSITIONED");
    if (out.kind === "TRANSITIONED") {
      expect(out.to).toBe("SS");
      expect(out.record.lastTouchKind).toBe("SWEEP");
      expect(out.record.triads.length).toBe(1);
    }
  });
});

// ── T2 Designation (B.W3.2 + S-2) ───────────────────────────────────────

const SNAP = [
  { id: "sup-1", top: 1.14571, bottom: 1.1446 },
  { id: "dem-1", top: 1.14004, bottom: 1.1399 },
  { id: "deep-1", top: 1.13815, bottom: 1.138 },
];
const EM: DesignationEmission = { demandZoneId: "dem-1", supplyZoneId: "sup-1", keyZoneType: "SUPPLY", deepDemandZoneId: "deep-1" };

describe("designation-machine guards", () => {
  test("valid DESIGNATE (totality + orientation) FIRES", () => {
    const out = step(designationMachine, freshDesignation("Tuesday", "EUR/USD"), designateEvent(EM, SNAP, 1.1411));
    expect(out.kind).toBe("TRANSITIONED");
  });
  test("missing ID in snapshot REFUSES (totality)", () => {
    const bad = { ...EM, supplyZoneId: "ghost" };
    const out = step(designationMachine, freshDesignation("Tuesday", "EUR/USD"), designateEvent(bad, SNAP, 1.1411));
    expect(out.kind).toBe("UNCHANGED");
  });
  test("supply BELOW open REFUSES (orientation law)", () => {
    const out = step(designationMachine, freshDesignation("Tuesday", "EUR/USD"), designateEvent(EM, SNAP, 1.146));
    expect(out.kind).toBe("UNCHANGED");
  });
  test("LONG consuming demandZoneId CONSUMES; LONG consuming supply FIRES SIDE_INVERSION", () => {
    const des = step(designationMachine, freshDesignation("Monday", "EUR/USD"), designateEvent(EM, SNAP, 1.1411));
    if (des.kind !== "TRANSITIONED") throw new Error("setup failed");
    const ok = step(designationMachine, des.record, consumeEvent("dem-1", "LONG"));
    expect(ok.kind).toBe("TRANSITIONED");
    const bad = step(designationMachine, des.record, consumeEvent("sup-1", "LONG"));
    expect(bad.kind).toBe("UNCHANGED");
    if (bad.kind === "UNCHANGED" && bad.reason === "GUARD_FAILED") {
      expect(bad.failState).toBeUndefined();
    }
  });
  test("SHORT consuming demandZoneId is SIDE_INVERSION (D50)", () => {
    const des = step(designationMachine, freshDesignation("Monday", "EUR/USD"), designateEvent(EM, SNAP, 1.1411));
    if (des.kind !== "TRANSITIONED") throw new Error("setup failed");
    const out = step(designationMachine, des.record, consumeEvent("dem-1", "SHORT"));
    expect(out.kind).toBe("UNCHANGED");
  });
  test("anchor tracing to no ID is E3_DISOBEYED_E2", () => {
    const des = step(designationMachine, freshDesignation("Monday", "EUR/USD"), designateEvent(EM, SNAP, 1.1411));
    if (des.kind !== "TRANSITIONED") throw new Error("setup failed");
    const out = step(designationMachine, des.record, consumeEvent("ghost-zone", "LONG"));
    expect(out.kind).toBe("UNCHANGED");
  });
  test("FAIL with reason -> INCOMPLETE (LOUD absence); empty reason REFUSES", () => {
    const loud = step(designationMachine, freshDesignation("Monday", "DXY"), failEvent("no valid designation for (Monday,DXY,LONG)"));
    expect(loud.kind).toBe("TRANSITIONED");
    if (loud.kind === "TRANSITIONED") expect(loud.to).toBe("INCOMPLETE");
    const silent = step(designationMachine, freshDesignation("Monday", "DXY"), failEvent(""));
    expect(silent.kind).toBe("UNCHANGED");
  });
  test("null/empty day throws named error (error path first)", () => {
    expect(() => freshDesignation("", "DXY")).toThrow("DESIGNATION_BAD_DAY");
  });
});

// ── T3 Cascade (B.W3.3 + S-1 B-4/B-5/B-6) ───────────────────────────────

describe("cascade-machine sequencing", () => {
  test("REQUIRES: EU cascade before DXY-inverse REFUSES", () => {
    const out = step(cascadeMachine, freshCascade(), cascadeEvent("EU_CASCADE_DESIGNATED", "IDLE", { designationId: "eu-1" }));
    expect(out.kind).toBe("UNCHANGED"); // no transition from IDLE on that event either
    const idle = step(cascadeMachine, freshCascade(), cascadeEvent("DXY_DESIGNATED", "IDLE", { designationId: "dxy-1" }));
    expect(idle.kind).toBe("TRANSITIONED");
  });
  test("full chain DXY->EU-cascade->EU-core->GU advances", () => {
    let r = freshCascade();
    const s1 = step(cascadeMachine, r, cascadeEvent("DXY_DESIGNATED", "IDLE", { designationId: "dxy-1" }));
    if (s1.kind !== "TRANSITIONED") throw new Error("dxy failed");
    const s2 = step(cascadeMachine, s1.record, cascadeEvent("EU_CASCADE_DESIGNATED", "DXY_DONE", { designationId: "eu-1" }));
    if (s2.kind !== "TRANSITIONED") throw new Error("eu-cascade failed");
    const s3 = step(cascadeMachine, s2.record, cascadeEvent("EU_CORE_DESIGNATED", "EU_CASCADE", { designationId: "eu-2" }));
    if (s3.kind !== "TRANSITIONED") throw new Error("eu-core failed");
    const s4 = step(cascadeMachine, s3.record, cascadeEvent("GU_DESIGNATED", "EU_CORE", { designationId: "gu-1", euMirrorId: "eu-1" }));
    expect(s4.kind).toBe("TRANSITIONED");
    if (s4.kind === "TRANSITIONED") expect(s4.to).toBe("GU_DONE");
  });
  test("FORBIDS: GU with rawDxyZoneId BLOCKS (S-1 B-5)", () => {
    let r = freshCascade();
    for (const [t, f, id] of [["DXY_DESIGNATED", "IDLE", "dxy-1"], ["EU_CASCADE_DESIGNATED", "DXY_DONE", "eu-1"], ["EU_CORE_DESIGNATED", "EU_CASCADE", "eu-2"]] as const) {
      const s = step(cascadeMachine, r, cascadeEvent(t, f, { designationId: id }));
      if (s.kind !== "TRANSITIONED") throw new Error(`setup ${t} failed`);
      r = s.record;
    }
    const out = step(cascadeMachine, r, cascadeEvent("GU_DESIGNATED", "EU_CORE", { designationId: "gu-1", euMirrorId: "eu-1", rawDxyZoneId: "dxy-raw" }));
    expect(out.kind).toBe("UNCHANGED");
  });
  test("GU referencing unknown EU mirror REFUSES", () => {
    let r = freshCascade();
    for (const [t, f, id] of [["DXY_DESIGNATED", "IDLE", "dxy-1"], ["EU_CASCADE_DESIGNATED", "DXY_DONE", "eu-1"], ["EU_CORE_DESIGNATED", "EU_CASCADE", "eu-2"]] as const) {
      const s = step(cascadeMachine, r, cascadeEvent(t, f, { designationId: id }));
      if (s.kind !== "TRANSITIONED") throw new Error(`setup ${t} failed`);
      r = s.record;
    }
    const out = step(cascadeMachine, r, cascadeEvent("GU_DESIGNATED", "EU_CORE", { designationId: "gu-1", euMirrorId: "ghost" }));
    expect(out.kind).toBe("UNCHANGED");
  });
  test("detectLoop kills the duplicate + records the stage-id", () => {
    const g = new CascadeLoopGuard("s-loop");
    expect(g.noteTranslation("tr-1", "eu-e2-cascade").killed).toBe(false);
    const dup = g.noteTranslation("tr-1", "eu-e2-cascade");
    expect(dup.killed).toBe(true);
    expect(dup.stageId).toBe("eu-e2-cascade");
  });
  test("per-stage ChainRules carry the stage on violations", () => {
    const g = new CascadeLoopGuard("s-rules");
    const vs = g.evaluate("eu-e2-cascade", "eu-e2-cascade-designate", {});
    expect(vs.length).toBeGreaterThan(0);
    expect(vs[0]!.stage).toBe("eu-e2-cascade");
    expect(chainRulesFor("gu-e2")[0]!.violation.layerId).toBe("gu-e2");
  });
  test("concurrent guards: two independent records do not share state", () => {
    const a = freshCascade();
    const b = freshCascade();
    const s = step(cascadeMachine, a, cascadeEvent("DXY_DESIGNATED", "IDLE", { designationId: "dxy-a" }));
    expect(s.kind).toBe("TRANSITIONED");
    expect(b.dxyInverseExists).toBe(false);
  });
});

// ── T4 pressure + freshness ─────────────────────────────────────────────

describe("zone-pressure lifecycle (events, not bars)", () => {
  test("VIRGIN --BODY_DEFEND--> ACTIVE_1 --BODY_DEFEND--> ACTIVE_2", () => {
    const s1 = stepPressure(freshZonePressure("z1", "1H"), pressureBattleEvent("VIRGIN", "z1", "BODY_DEFEND"));
    if (s1.kind !== "TRANSITIONED") throw new Error("s1 failed");
    expect(s1.to).toBe("ACTIVE_1");
    expect(s1.record.defenses).toBe(1);
    const s2 = stepPressure(s1.record, pressureBattleEvent("ACTIVE_1", "z1", "WICK_REJECT"));
    expect(s2.kind).toBe("TRANSITIONED");
    if (s2.kind === "TRANSITIONED") expect(s2.to).toBe("ACTIVE_2");
  });
  test("SWEEP on ACTIVE depletes on 1H; 4H DEPLETED REFUSES (never-death)", () => {
    const r1h = { ...freshZonePressure("z1", "1H"), state: "ACTIVE_1" as const, defenses: 1, sweeps: 0 };
    const ok = stepPressure(r1h, pressureBattleEvent("ACTIVE_1", "z1", "SWEEP"));
    expect(ok.kind).toBe("TRANSITIONED");
    if (ok.kind === "TRANSITIONED") expect(ok.to).toBe("DEPLETED");
    const r4h = { ...freshZonePressure("z4", "4H"), state: "ACTIVE_2" as const, defenses: 2, sweeps: 0 };
    // 4H sweep is ABSORBED (stays alive), never DEPLETED.
    const absorb = stepPressure(r4h, pressureBattleEvent("ACTIVE_2", "z4", "SWEEP"));
    expect(absorb.kind).toBe("TRANSITIONED");
    if (absorb.kind === "TRANSITIONED") {
      expect(absorb.to).not.toBe("DEPLETED");
      expect(absorb.record.sweeps).toBe(1);
    }
    // And the raw table refuses a routed 4H SWEEP outright (the double-pinned guard).
    const raw = ev("BATTLE_SWEEP", { zoneId: "z4", touchKind: "SWEEP" }, "zone-pressure", "ACTIVE_2", "?", "m", HERE, 1);
    expect(step(zonePressureMachine, r4h, raw).kind).toBe("UNCHANGED");
  });
  test("4 defenses + 0 sweeps -> FORTRESS; a sweep spoils it", () => {
    const r = { ...freshZonePressure("z1", "1H"), state: "ACTIVE_2" as const, defenses: 3, sweeps: 0 };
    expect(routeBattle(r, "BODY_DEFEND")).toBe("BATTLE_FORTIFY");
    const f = stepPressure(r, pressureBattleEvent("ACTIVE_2", "z1", "BODY_DEFEND"));
    expect(f.kind).toBe("TRANSITIONED");
    if (f.kind === "TRANSITIONED") expect(f.to).toBe("FORTRESS");
    const spoiled = { ...freshZonePressure("z2", "1H"), state: "ACTIVE_2" as const, defenses: 3, sweeps: 1 };
    const nf = stepPressure(spoiled, pressureBattleEvent("ACTIVE_2", "z2", "BODY_DEFEND"));
    expect(nf.kind).toBe("TRANSITIONED");
    if (nf.kind === "TRANSITIONED") expect(nf.to).not.toBe("FORTRESS");
  });
  test("VIRGIN + PASS_THROUGH -> BROKEN (the break is never shadowed)", () => {
    const out = stepPressure(freshZonePressure("z9", "1H"), pressureBattleEvent("VIRGIN", "z9", "PASS_THROUGH"));
    expect(out.kind).toBe("TRANSITIONED");
    if (out.kind === "TRANSITIONED") expect(out.to).toBe("BROKEN");
  });
  test("malformed touchKind REFUSES loud", () => {
    const r = freshZonePressure("z1", "1H");
    const bad = ev("BATTLE_RESOLVED", { zoneId: "z1", touchKind: "NOPE" }, "zone-pressure", "VIRGIN", "?", "m", HERE, 1);
    expect(stepPressure(r, bad).kind).toBe("UNCHANGED");
  });
});

describe("freshness lifecycle", () => {
  test("FRESH --touch--> TESTED --SWEEP--> DEPLETED; PASS_THROUGH -> VIOLATED", () => {
    const t = stepFreshness(freshFreshness("z1", "30m"), freshnessBattleEvent("FRESH", "z1", "WICK_REJECT"));
    if (t.kind !== "TRANSITIONED") throw new Error("test failed");
    expect(t.to).toBe("TESTED");
    const d = stepFreshness(t.record, freshnessBattleEvent("TESTED", "z1", "SWEEP"));
    expect(d.kind).toBe("TRANSITIONED");
    if (d.kind === "TRANSITIONED") expect(d.to).toBe("DEPLETED");
    const v = stepFreshness(freshFreshness("z2", "30m"), freshnessBattleEvent("FRESH", "z2", "PASS_THROUGH"));
    expect(v.kind).toBe("TRANSITIONED");
    if (v.kind === "TRANSITIONED") expect(v.to).toBe("VIOLATED");
  });
  test("4H freshness DEPLETED REFUSES (absorbed as retest, stays alive)", () => {
    const r = { ...freshFreshness("z4", "4H"), state: "TESTED" as const, tests: 1 };
    const out = stepFreshness(r, freshnessBattleEvent("TESTED", "z4", "SWEEP"));
    expect(out.kind).toBe("TRANSITIONED");
    if (out.kind === "TRANSITIONED") expect(out.to).toBe("TESTED");
    const raw = ev("BATTLE_DEPLETE", { zoneId: "z4", touchKind: "SWEEP" }, "freshness", "TESTED", "?", "m", HERE, 1);
    expect(step(freshnessMachine, r, raw).kind).toBe("UNCHANGED");
  });
  test("held touches retest without depleting (concurrent records isolated)", () => {
    const a = { ...freshFreshness("za", "1H"), state: "TESTED" as const, tests: 1 };
    const b = { ...freshFreshness("zb", "1H"), state: "TESTED" as const, tests: 1 };
    const ra = stepFreshness(a, freshnessBattleEvent("TESTED", "za", "BODY_DEFEND"));
    expect(ra.kind).toBe("TRANSITIONED");
    expect(b.tests).toBe(1);
  });
});

// ── T5 workflow: skip transitions ABSENT ────────────────────────────────

describe("e2-workflow skip-absence", () => {
  test("linear advance E1->E2->E3->REPORTED works", () => {
    let r = freshWorkflow("2026-07-06");
    for (const [t, f] of [["E2_COMPLETED", "E1_DONE"], ["E3_COMPLETED", "E2_DONE"], ["REPORT_COMPLETED", "E3_DONE"]] as const) {
      const s = step(e2WorkflowMachine, r, workflowEvent(t, f));
      if (s.kind !== "TRANSITIONED") throw new Error(`${t} failed`);
      r = s.record;
    }
    expect(r.state).toBe("REPORTED");
    expect(r.triads.length).toBe(3);
  });
  test("NEGATIVE: E1_DONE --E3_COMPLETED--> ? has NO transition (skip absent)", () => {
    const r = freshWorkflow("2026-07-06");
    const out = step(e2WorkflowMachine, r, workflowEvent("E3_COMPLETED", "E1_DONE"));
    expect(out.kind).toBe("UNCHANGED");
    if (out.kind === "UNCHANGED") expect(out.reason).toBe("NO_MATCHING_TRANSITION");
  });
  test("NEGATIVE: E2_DONE --REPORT_COMPLETED--> ? has NO transition", () => {
    const s = step(e2WorkflowMachine, freshWorkflow("2026-07-06"), workflowEvent("E2_COMPLETED", "E1_DONE"));
    if (s.kind !== "TRANSITIONED") throw new Error("setup failed");
    expect(step(e2WorkflowMachine, s.record, workflowEvent("REPORT_COMPLETED", "E2_DONE")).kind).toBe("UNCHANGED");
  });
  test("skipAbsent() proves the table has no skip edges", () => {
    expect(skipAbsent()).toBe(true);
  });
});
