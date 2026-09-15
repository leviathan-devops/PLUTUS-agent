import { describe, expect, test } from "bun:test";
import { reachable, step } from "../../substrate/L3-lasme/index.ts";
import { ev } from "../machines/types.ts";
import {
  e2WorkflowMachine,
  freshWorkflow,
  skipAbsent,
  workflowEvent,
  type E2WorkflowRecord,
  type E2WorkflowState,
} from "../machines/workflow-machine.ts";

const STATES: E2WorkflowState[] = ["E1_DONE", "E2_DONE", "E3_DONE", "REPORTED"];

function advance(record: E2WorkflowRecord, type: "E2_COMPLETED" | "E3_COMPLETED" | "REPORT_COMPLETED"): E2WorkflowRecord {
  const out = step(e2WorkflowMachine, record, workflowEvent(type, record.state as E2WorkflowState));
  if (out.kind !== "TRANSITIONED") {
    throw new Error(`[WORKFLOW_SETUP] ${type} from ${record.state} refused: ${JSON.stringify(out)}`);
  }
  return out.record;
}

describe("workflow skip-absence — E1_DONE -> E3_DONE is UNREACHABLE", () => {
  test("the skip transition does not exist in the table (machine-checked)", () => {
    expect(skipAbsent()).toBe(true);
  });

  test("E3_COMPLETED from E1_DONE is UNCHANGED (the skip cannot fire)", () => {
    const out = step(e2WorkflowMachine, freshWorkflow("2026-07-06"), workflowEvent("E3_COMPLETED", "E1_DONE"));
    expect(out.kind).toBe("UNCHANGED");
  });

  test("REPORT_COMPLETED from E1_DONE and E2_DONE is UNCHANGED", () => {
    expect(
      step(e2WorkflowMachine, freshWorkflow("2026-07-06"), workflowEvent("REPORT_COMPLETED", "E1_DONE")).kind,
    ).toBe("UNCHANGED");
    const atE2 = advance(freshWorkflow("2026-07-06"), "E2_COMPLETED");
    expect(step(e2WorkflowMachine, atE2, workflowEvent("REPORT_COMPLETED", "E2_DONE")).kind).toBe(
      "UNCHANGED",
    );
  });

  test("every legal path walks all 4 states in order with growing evidence", () => {
    let r = freshWorkflow("2026-07-06");
    const seen = [r.state];
    for (const type of ["E2_COMPLETED", "E3_COMPLETED", "REPORT_COMPLETED"] as const) {
      r = advance(r, type);
      seen.push(r.state);
    }
    expect(seen).toEqual(["E1_DONE", "E2_DONE", "E3_DONE", "REPORTED"]);
    expect(r.triads.length).toBe(3);
    expect(r.week).toBe("2026-07-06");
  });

  test("the only legal edges are the single-step forwards", () => {
    const edges = e2WorkflowMachine.transitions.map((t) => ({ from: t.from ?? [], to: t.to }));
    const pairs: Array<[E2WorkflowState, E2WorkflowState, boolean]> = [];
    for (const from of STATES)
      for (const to of STATES) {
        const direct = edges.some((e) => e.from.includes(from) && e.to === to);
        pairs.push([from, to, direct]);
      }
    const live = pairs.filter(([, , d]) => d).map(([f, t]) => `${f}->${t}`.toString());
    expect(live.sort()).toEqual(["E1_DONE->E2_DONE", "E2_DONE->E3_DONE", "E3_DONE->REPORTED"].sort());
  });

  test("reachable() proves E3 is reachable only via E2 (no direct edge)", () => {
    expect(reachable(e2WorkflowMachine.transitions, "E1_DONE", "E3_DONE")).toBe(true);
    expect(skipAbsent()).toBe(true);
  });

  test("adversarial: backward event E2_COMPLETED from E2_DONE cannot fire", () => {
    const atE2 = advance(freshWorkflow("2026-07-06"), "E2_COMPLETED");
    expect(step(e2WorkflowMachine, atE2, workflowEvent("E2_COMPLETED", "E2_DONE")).kind).toBe(
      "UNCHANGED",
    );
    expect(atE2.state).toBe("E2_DONE");
  });

  test("adversarial: terminal REPORTED accepts no further event", () => {
    let r = freshWorkflow("2026-07-06");
    for (const type of ["E2_COMPLETED", "E3_COMPLETED", "REPORT_COMPLETED"] as const) {
      r = advance(r, type);
    }
    expect(r.state).toBe("REPORTED");
    for (const type of ["E2_COMPLETED", "E3_COMPLETED", "REPORT_COMPLETED"] as const) {
      expect(step(e2WorkflowMachine, r, workflowEvent(type, "REPORTED")).kind).toBe("UNCHANGED");
    }
  });

  test("adversarial: unknown event type is UNCHANGED, never a silent move", () => {
    const r = freshWorkflow("2026-07-06");
    const bogus = ev(
      "SKIP_TO_REPORT",
      {},
      "e2-workflow",
      "E1_DONE",
      "REPORTED",
      "test:bogus",
      "src/e2/tests/workflow.test.ts",
      1,
    );
    const out = step(e2WorkflowMachine, r, bogus);
    expect(out.kind).toBe("UNCHANGED");
    expect(r.state).toBe("E1_DONE");
  });

  test("adversarial: two weeks walk independently (no shared state)", () => {
    const a = advance(freshWorkflow("2026-07-06"), "E2_COMPLETED");
    const b = freshWorkflow("2026-07-13");
    expect(a.state).toBe("E2_DONE");
    expect(b.state).toBe("E1_DONE");
    expect(a.week).toBe("2026-07-06");
  });
});
