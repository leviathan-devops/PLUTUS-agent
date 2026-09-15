import { describe, expect, test } from "bun:test";
import { step } from "../../substrate/L3-lasme/index.ts";
import { ev } from "../machines/types.ts";
import {
  dayOpenEvent,
  freshShape,
  shapeChainMachine,
  type ShapeRecord,
  type ShapeState,
} from "../machines/shape-chain-machine.ts";
import { divergenceOf } from "../machines/types.ts";
import type { PairKey } from "../machines/types.ts";
import { PAIRS, loadGoldenWeek } from "./support";

function dayStep(record: ShapeRecord, fields: Record<string, unknown>) {
  return step(shapeChainMachine, record, dayOpenEvent(record.state as ShapeState, fields));
}

const SS_TO_BS = { zfp: 0.5, marubozuAnatomy: true };
const BS_TO_R = { zfp: 0.3 };
const R_TO_WL = { zfp: 0.3, recoveryToStructure: true };
const WL_TO_SS = { zfp: 0.3, consolidationPhase: true };

describe("shape-chain golden — 5-day decomposition per pair vs the operator oracle", () => {
  const gw = loadGoldenWeek();

  test("oracle shape chains match the cascade: SS BS R BS WL on all 3 pairs", () => {
    for (const pair of PAIRS) {
      expect(gw.shapeChains[pair]).toEqual(["SS", "BS", "R", "BS", "WL"]);
    }
  });

  test("walkable prefix lands exactly: Mon SS -> Tue BS -> Wed R (all 3 pairs)", () => {
    for (const pair of PAIRS) {
      const oracle = gw.shapeChains[pair] as ShapeState[];
      let r = freshShape(pair);
      expect(r.state).toBe(oracle[0]);
      const tue = dayStep(r, SS_TO_BS);
      if (tue.kind !== "TRANSITIONED") throw new Error(`Tue refused: ${JSON.stringify(tue)}`);
      expect(tue.record.state).toBe(oracle[1]);
      const wed = dayStep(tue.record, BS_TO_R);
      if (wed.kind !== "TRANSITIONED") throw new Error(`Wed refused: ${JSON.stringify(wed)}`);
      expect(wed.record.state).toBe(oracle[2]);
      r = wed.record;
      expect(r.triads.length).toBe(2);
    }
  });

  test("match table vs the oracle (Thu/Fri gaps recorded, never papered over)", () => {
    const rows: string[] = [];
    for (const pair of PAIRS) {
      const oracle = gw.shapeChains[pair] as ShapeState[];
      let r = freshShape(pair);
      const seen: string[] = [r.state];
      const tue = dayStep(r, SS_TO_BS);
      if (tue.kind === "TRANSITIONED") {
        r = tue.record;
        seen.push(r.state);
        const wed = dayStep(r, BS_TO_R);
        if (wed.kind === "TRANSITIONED") {
          r = wed.record;
          seen.push(r.state);
          const thu = dayStep(r, { zfp: 0.5, reverseContinuation: true });
          if (thu.kind === "TRANSITIONED") {
            r = thu.record;
            seen.push(r.state);
            const fri = dayStep(r, { zfp: 0.3, recoveryToStructure: true });
            seen.push(fri.kind === "TRANSITIONED" ? fri.record.state : "GAP(no-edge)");
          } else {
            seen.push("GAP(R->BS:no-edge)");
            seen.push("GAP(BS->WL:unreached)");
          }
        }
      }
      rows.push(`${pair}: machine=[${seen.join(" ")}] oracle=[${oracle.join(" ")}]`);
    }
    for (const row of rows) console.log(row);
    expect(rows.length).toBe(3);
    for (const row of rows) {
      expect(row).toContain("machine=[SS BS R");
    }
  });

  test("R -> BS has no DAY_OPEN edge: the Thu step is UNCHANGED (the documented gap)", () => {
    const r: ShapeRecord = { ...freshShape("DXY"), state: "R" };
    const out = dayStep(r, { zfp: 0.5, reverseContinuation: true });
    expect(out.kind).toBe("UNCHANGED");
  });

  test("BS -> WL has no DAY_OPEN edge: the Fri step from BS is UNCHANGED (the documented gap)", () => {
    const r: ShapeRecord = { ...freshShape("DXY"), state: "BS" };
    const out = dayStep(r, { zfp: 0.1, recoveryToStructure: true });
    expect(out.kind).toBe("UNCHANGED");
  });

  test("cascade divergence: EU vs DXY oracle chains diverge 0.00", () => {
    const dxy = gw.shapeChains["DXY"];
    for (const pair of ["EUR/USD", "GBP/USD"] as PairKey[]) {
      expect(divergenceOf(gw.shapeChains[pair], dxy)).toBe(0);
    }
  });

  test("r-to-wl + wl-to-ss edges fire on constructed records (the table's live R/WL path)", () => {
    const atR: ShapeRecord = { ...freshShape("DXY"), state: "R" };
    const wl = dayStep(atR, R_TO_WL);
    if (wl.kind !== "TRANSITIONED") throw new Error(`R->WL refused: ${JSON.stringify(wl)}`);
    expect(wl.record.state).toBe("WL");
    const ss = dayStep(wl.record, WL_TO_SS);
    if (ss.kind !== "TRANSITIONED") throw new Error(`WL->SS refused: ${JSON.stringify(ss)}`);
    expect(ss.record.state).toBe("SS");
  });

  test("macro authority: contradicting macro refuses with chainsContradict (INCONCLUSIVE idiom)", () => {
    const r = freshShape("DXY");
    const out = dayStep(r, { ...SS_TO_BS, macroShape: "R", divergence: 0.5 });
    expect(out.kind).toBe("UNCHANGED");
  });

  test("macro agreement below threshold does not block the transition", () => {
    const r = freshShape("DXY");
    const out = dayStep(r, { ...SS_TO_BS, macroShape: "BS", divergence: 0.1 });
    if (out.kind !== "TRANSITIONED") throw new Error(`macro-agree refused: ${JSON.stringify(out)}`);
    expect(out.record.state).toBe("BS");
  });

  test("adversarial: malformed DAY_OPEN (no numeric zfp) is refused", () => {
    const r = freshShape("DXY");
    const out = dayStep(r, { marubozuAnatomy: true });
    expect(out.kind).toBe("UNCHANGED");
  });

  test("adversarial: evidence matching no guard from SS is refused, state held", () => {
    const r = freshShape("DXY");
    const out = dayStep(r, { zfp: 0.1 });
    expect(out.kind).toBe("UNCHANGED");
    expect(r.state).toBe("SS");
  });

  test("adversarial: unknown pair throws at construction", () => {
    expect(() => freshShape("XXX" as never)).toThrow();
  });

  test("BATTLE_RESOLVED loop advances evidence without moving the shape", () => {
    const r = freshShape("DXY");
    const e = ev(
      "BATTLE_RESOLVED",
      { zoneId: "DXY|1H|0|z", touchKind: "WICK_REJECT" },
      "shape-chain",
      "SS",
      "SS",
      "test:battle",
      "src/e2/tests/shape-chain-golden.test.ts",
      1,
    );
    const out = step(shapeChainMachine, r, e);
    if (out.kind !== "TRANSITIONED") throw new Error(`battle loop refused: ${JSON.stringify(out)}`);
    expect(out.record.state).toBe("SS");
    expect(out.record.lastTouchKind).toBe("WICK_REJECT");
  });
});
