// src/kernel/l1-telescope.test.ts — adversarial battery for B.W5-L1 (S-6 B-1..B-4).
import { describe, test, expect } from "bun:test";
import type { ZoneModel, Rung } from "../e1/core/types";
import { computeTelescope } from "./l1-telescope";

function zone(over: Partial<ZoneModel> & { id: string }): ZoneModel {
  return {
    type: "SUPPLY",
    top: 1.14571,
    bottom: 1.1446,
    classification: "BoM",
    formationMs: 1783076400000,
    originIdx: 0,
    bw: 3.5,
    bf: 0.7,
    prior: "NONE",
    zfp: 0.6,
    tf: "4H",
    ...over,
  };
}

const PIP = 0.0001;

describe("l1-telescope happy path", () => {
  test("4H king contains the 1H general — no rejections", () => {
    const htf = zone({ id: "EU|4H|1|1.1446", tf: "4H", classification: "BoM", bottom: 1.14, top: 1.15 });
    const ltf = zone({ id: "EU|1H|2|1.1446", tf: "1H", classification: "MoM", bottom: 1.1446, top: 1.14571 });
    const v = computeTelescope({ zones: [htf, ltf], rungs: [], meta: { pair: "EUR/USD", pip: PIP } });
    expect(v.htfZoneIds).toContain(htf.id);
    expect(v.boMOriginIds).toContain(htf.id);
    expect(v.rejections.length).toBe(0);
    expect(v.containmentChecks.length).toBeGreaterThan(0);
    expect(v.containmentChecks.every((c) => c.contained)).toBe(true);
  });

  test("1H BoM selected per W2 doctrine routing; rung placed on non-4H host", () => {
    const htf = zone({ id: "EU|4H|1|1.1446", tf: "4H", classification: "BoM", bottom: 1.14, top: 1.15 });
    const gen = zone({ id: "EU|1H|2|1.1446", tf: "1H", classification: "BoM", bottom: 1.1446, top: 1.14571 });
    const rung: Rung = { id: "r1", zoneId: gen.id, floor: 1.1446, ceiling: 1.145, type: "SUPPLY" };
    const v = computeTelescope({ zones: [htf, gen], rungs: [rung], meta: { pair: "EUR/USD", pip: PIP } });
    expect(v.boMOriginIds).toContain(gen.id);
    expect(v.lqzRungIds).toContain("r1");
  });
});

describe("l1-telescope adversarial", () => {
  test("empty zones array throws loud", () => {
    expect(() => computeTelescope({ zones: [], rungs: [], meta: { pair: "EUR/USD", pip: PIP } })).toThrow(
      "malformed input",
    );
  });

  test("null input throws loud", () => {
    expect(() => computeTelescope(null as unknown as never)).toThrow("malformed input");
  });

  test("BoM on 30m is S-6-B-2 REJECT (never a silent origin)", () => {
    const htf = zone({ id: "EU|4H|1|1.1446", tf: "4H", classification: "BoM", bottom: 1.14, top: 1.15 });
    const bad = zone({ id: "EU|30m|9|1.1446", tf: "30m", classification: "BoM", bottom: 1.1446, top: 1.145 });
    const v = computeTelescope({ zones: [htf, bad], rungs: [], meta: { pair: "EUR/USD", pip: PIP } });
    expect(v.boMOriginIds).not.toContain(bad.id);
    expect(v.rejections.some((r) => r.zoneId === bad.id && r.law === "S-6-B-2")).toBe(true);
  });

  test("30m non-MoM is S-6-B-3 REJECT", () => {
    const htf = zone({ id: "EU|4H|1|1.1446", tf: "4H", classification: "BoM", bottom: 1.14, top: 1.15 });
    const bad = zone({ id: "EU|30m|9|1.1446", tf: "30m", classification: "IP", bottom: 1.1446, top: 1.145 });
    const v = computeTelescope({ zones: [htf, bad], rungs: [], meta: { pair: "EUR/USD", pip: PIP } });
    expect(v.rejections.some((r) => r.zoneId === bad.id && r.law === "S-6-B-3")).toBe(true);
  });

  test("orphan 1H with no 4H ancestor is S-6-B-1 REJECT", () => {
    const orphan = zone({ id: "EU|1H|2|1.20", tf: "1H", classification: "MoM", bottom: 1.2, top: 1.21 });
    const v = computeTelescope({ zones: [orphan], rungs: [], meta: { pair: "EUR/USD", pip: PIP } });
    expect(v.rejections.some((r) => r.zoneId === orphan.id && r.law === "S-6-B-1")).toBe(true);
  });

  test("rung hosted on a 4H zone is S-6-B-4 REJECT", () => {
    const htf = zone({ id: "EU|4H|1|1.1446", tf: "4H", classification: "BoM", bottom: 1.14, top: 1.15 });
    const rung: Rung = { id: "r4h", zoneId: htf.id, floor: 1.1446, ceiling: 1.145, type: "SUPPLY" };
    const v = computeTelescope({ zones: [htf], rungs: [rung], meta: { pair: "EUR/USD", pip: PIP } });
    expect(v.lqzRungIds).not.toContain("r4h");
    expect(v.rejections.some((r) => r.law === "S-6-B-4")).toBe(true);
  });

  test("non-positive pip quantum throws loud", () => {
    const htf = zone({ id: "EU|4H|1|1.1446" });
    expect(() => computeTelescope({ zones: [htf], rungs: [], meta: { pair: "EUR/USD", pip: 0 } })).toThrow(
      "malformed input",
    );
  });
});
