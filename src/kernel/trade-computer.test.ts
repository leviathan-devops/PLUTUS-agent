import { describe, test, expect } from "bun:test";
import { computeTrades, TradeComputerError, RRR_FLOOR } from "./trade-computer";
import type { TradeComputerVerdicts, TradeComputerErrorCode } from "./trade-computer";
import { KernelJournal, JournalCorruptError, KERNEL_JOURNAL_GENESIS } from "./journal";
import type { PlutusCard } from "../card/schema";

const T0 = 1783317600000;

function provenanceEntries(ids: string[]) {
  return ids.map((id) => ({
    id,
    source: "src/e1/actors/zone-map.ts:88",
    kind: "e1-zone" as const,
  }));
}

function baseCard(): PlutusCard {
  return {
    meta: { pair: "EUR/USD", tf: "1H", analysisPointMs: T0 },
    zones: [{ zoneId: "EU|1H|S|1" }, { zoneId: "EU|1H|D|1" }],
    designations: [
      { id: "DES1", supplyZoneId: "EU|1H|S|1", demandZoneId: "EU|1H|D|1", direction: "SHORT" },
    ],
    visuals: { charts: [{ path: "screenshots/eu_1h.png", tf: "1H", grade: "PASS" as const }] },
    setups: [{ id: "EU1", zoneId: "EU|1H|S|1", direction: "SHORT", rr: 4.4 }],
    provenance: {
      entries: provenanceEntries(["EU|1H|S|1", "EU|1H|D|1", "DES1", "EU1", "screenshots/eu_1h.png"]),
    },
    grounding: {
      forwardPosition: 12,
      anchorsNumeric: true,
      directionOrder: true,
      targetClosed: true,
      zoneIdsReal: true,
      projectionIdsReal: true,
      rrrComputable: true,
    },
  } as PlutusCard;
}

function baseVerdicts(): TradeComputerVerdicts {
  return {
    l1: {
      htfZoneIds: ["EU|4H|D|0"],
      boMOriginIds: ["EU|1H|S|1"],
      lqzRungIds: [],
      rungPlacements: [],
      containmentChecks: [],
      rejections: [],
    },
    l2: {
      fortressZoneIds: ["EU|1H|S|1"],
      phantomZoneIds: [],
      depletedZoneIds: [],
      brokenZoneIds: [],
      overlaps: [],
      shields: [],
      overlay: [
        { zoneId: "EU|1H|S|1", defenseCount: 4, sweepCount: 0, state: "FORTRESS" },
        { zoneId: "EU|1H|D|1", defenseCount: 1, sweepCount: 0, state: "ACTIVE" },
      ],
    },
    l3: {
      alignments: [
        { tradeId: "EU1", swingZoneId: "EU|1H|S|1", ratio: 0.618, kind: "retracement", distancePips: 2, aligned: true },
      ],
      tradeChecks: [{ tradeId: "EU1", alignedCount: 1, entryOk: true, targetOk: true }],
      ratiosUsed: { retracements: [0.382, 0.5, 0.618, 0.786], extensions: [1.272, 1.618, 2.618] },
    },
    l4: {
      perTradeInverseMapping: [
        {
          tradeId: "EU1",
          pair: "EUR/USD",
          direction: "SHORT",
          dxyInverseDirection: "LONG",
          dxyInverseZoneId: "DXY|4H|D|1",
          inverseExists: true,
        },
      ],
      divergenceScore: 0.12,
      divergenceFlag: false,
      floorCheck: "VALID",
    },
    l5: {
      score: 8,
      supportingLawIds: ["LAW-14"],
      contradictingLawIds: [],
      requiredLawIds: ["LAW-14"],
      entryChecklist: [{ item: "rrr-floor", checked: true, evidence: "setup EU1 rr 4.4" }],
      tradeValid: true,
    },
  };
}

function expectTradeError(fn: () => unknown, code: TradeComputerErrorCode, tradeId: string | null) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(TradeComputerError);
    expect((e as TradeComputerError).code).toBe(code);
    expect((e as TradeComputerError).tradeId).toBe(tradeId);
    return e as TradeComputerError;
  }
  throw new Error(`SHOULD_HAVE_THROWN_${code}`);
}

describe("trade-computer happy path", () => {
  test("card+verdicts emit one projection with the full provenance chain", () => {
    const journal = new KernelJournal();
    const projections = computeTrades(baseCard(), baseVerdicts(), { journal, timestampMs: T0 });
    expect(projections.length).toBe(1);
    const p = projections[0] as NonNullable<(typeof projections)[0]>;
    expect(p.id).toBe("EU1");
    expect(p.pair).toBe("EUR/USD");
    expect(p.direction).toBe("SHORT");
    expect(p.entryZoneRef).toBe("EU|1H|S|1");
    expect(p.slZoneRef).toBe("EU|1H|S|1");
    expect(p.tpZoneRef).toBe("EU|1H|D|1");
    expect(p.rr).toBe(4.4);
    expect(p.metaLayerVerdicts.L1.boMOriginIds).toContain("EU|1H|S|1");
    expect(p.metaLayerVerdicts.L4.perTradeInverseMapping[0]?.dxyInverseZoneId).toBe("DXY|4H|D|1");
    expect(p.metaLayerVerdicts.L5.tradeValid).toBe(true);
    expect(p.provenance).toMatchObject({
      cardSetupId: "EU1",
      cardZoneId: "EU|1H|S|1",
      cardDesignationId: "DES1",
      l1TelescopeZoneId: "EU|1H|S|1",
      l2PressureZoneId: "EU|1H|S|1",
      l3FibTradeId: "EU1",
      l4DxyInverseZoneId: "DXY|4H|D|1",
      l5Score: 8,
    });
    const rows = journal.query(`trade-computer:EUR/USD:${T0}`);
    // SC-16: six leg rows (card→L1→L2→L3→L4→L5) per setup precede the emit row, same causationId.
    expect(rows.length).toBe(7);
    expect(rows.map((r) => r.kind)).toEqual([
      "trade-computer.leg.card",
      "trade-computer.leg.l1",
      "trade-computer.leg.l2",
      "trade-computer.leg.l3",
      "trade-computer.leg.l4",
      "trade-computer.leg.l5",
      "trade-computer.emit",
    ]);
  });

  test("rr exactly at the D-R1 floor emits", () => {
    expect(RRR_FLOOR).toBe(2.5);
    const card = baseCard();
    (card.setups[0] as { rr: number }).rr = 2.5;
    const projections = computeTrades(card, baseVerdicts());
    expect(projections.length).toBe(1);
    expect(projections[0]?.rr).toBe(2.5);
  });
});

describe("trade-computer refusals", () => {
  test("L4 missing inverse throws TRADE_COMPUTER_CASCADE_FAIL with zero partial emissions", () => {
    const card = baseCard();
    card.setups.push({ id: "EU2", zoneId: "EU|1H|S|1", direction: "SHORT", rr: 3.0 });
    card.provenance.entries.push({ id: "EU2", source: "src/e2/machines/designation.ts:41", kind: "setup" });
    (card.designations[0] as { id: string }).id = "DES1";
    const verdicts = baseVerdicts();
    verdicts.l3.tradeChecks.push({ tradeId: "EU2", alignedCount: 1, entryOk: true, targetOk: true });
    const journal = new KernelJournal();
    expectTradeError(
      () => computeTrades(card, verdicts, { journal, timestampMs: T0 }),
      "TRADE_COMPUTER_CASCADE_FAIL",
      "EU2",
    );
    expect(journal.all().length).toBe(1);
    expect(journal.all()[0]?.kind).toBe("trade-computer.refuse");
    expect(journal.all()[0]?.payload).toContain("TRADE_COMPUTER_CASCADE_FAIL");
  });

  test("provenance-incomplete card id throws the typed refusal", () => {
    const card = baseCard();
    card.provenance.entries = card.provenance.entries.filter((e) => e.id !== "EU1");
    expectTradeError(() => computeTrades(card, baseVerdicts()), "TRADE_COMPUTER_PROVENANCE_INCOMPLETE", null);
  });

  test("rr 2.0 setup throws RRR_FLOOR_VIOLATION naming the setup", () => {
    const card = baseCard();
    (card.setups[0] as { rr: number }).rr = 2.0;
    expectTradeError(() => computeTrades(card, baseVerdicts()), "RRR_FLOOR_VIOLATION", "EU1");
  });

  test("L3 fib mismatch throws TRADE_COMPUTER_FIB_MISMATCH", () => {
    const verdicts = baseVerdicts();
    verdicts.l3.tradeChecks = [{ tradeId: "EU1", alignedCount: 0, entryOk: false, targetOk: true }];
    expectTradeError(() => computeTrades(baseCard(), verdicts), "TRADE_COMPUTER_FIB_MISMATCH", "EU1");
  });

  test("L5 confluence false throws TRADE_COMPUTER_CONFLUENCE_FAIL", () => {
    const verdicts = baseVerdicts();
    verdicts.l5.tradeValid = false;
    expectTradeError(() => computeTrades(baseCard(), verdicts), "TRADE_COMPUTER_CONFLUENCE_FAIL", null);
  });

  test("null card and null verdicts throw typed invalid-input refusals", () => {
    expectTradeError(() => computeTrades(null as unknown as PlutusCard, baseVerdicts()), "TRADE_COMPUTER_INVALID_CARD", null);
    expectTradeError(() => computeTrades(baseCard(), null as unknown as TradeComputerVerdicts), "TRADE_COMPUTER_INVALID_VERDICTS", null);
    expectTradeError(() => computeTrades(baseCard(), baseVerdicts(), { journal: new KernelJournal() }), "TRADE_COMPUTER_INVALID_INPUT", null);
  });

  test("empty setups array throws INVALID_CARD", () => {
    const card = baseCard();
    (card as unknown as { setups: unknown[] }).setups = [];
    expectTradeError(() => computeTrades(card, baseVerdicts()), "TRADE_COMPUTER_INVALID_CARD", null);
  });
});

describe("kernel journal hash chain", () => {
  test("append rows chain GENESIS then entry hashes in seq order", () => {
    const journal = new KernelJournal();
    const a = journal.append({ causationId: "run-1", kind: "trade-computer.emit", payload: { n: 1 }, timestampMs: T0 });
    const b = journal.append({ causationId: "run-1", kind: "trade-computer.emit", payload: { n: 2 }, timestampMs: T0 + 1 });
    expect(a.seq).toBe(0);
    expect(a.prevHash).toBe(KERNEL_JOURNAL_GENESIS);
    expect(b.seq).toBe(1);
    expect(b.prevHash).toBe(a.entryHash);
    journal.checkIntegrity();
    expect(journal.query("run-1").length).toBe(2);
    expect(journal.query("does-not-exist")).toEqual([]);
  });

  test("tampered payload breaks the chain loud naming seq 1", () => {
    const journal = new KernelJournal();
    journal.append({ causationId: "t", kind: "k", payload: { v: 1 }, timestampMs: T0 });
    journal.append({ causationId: "t", kind: "k", payload: { v: 2 }, timestampMs: T0 });
    journal.corruptForTest(1, { payload: JSON.stringify({ v: "FORGED" }) });
    try {
      journal.checkIntegrity();
    } catch (e) {
      expect(e).toBeInstanceOf(JournalCorruptError);
      expect((e as JournalCorruptError).code).toBe("JOURNAL_CORRUPT");
      expect((e as JournalCorruptError).seq).toBe(1);
      return;
    }
    throw new Error("SHOULD_HAVE_THROWN_JOURNAL_CORRUPT");
  });

  test("empty causationId append is refused and stores nothing", () => {
    const journal = new KernelJournal();
    try {
      journal.append({ causationId: "", kind: "k", payload: 1, timestampMs: T0 });
    } catch (e) {
      expect((e as JournalCorruptError).code).toBe("JOURNAL_CORRUPT");
      expect(journal.all().length).toBe(0);
      return;
    }
    throw new Error("SHOULD_HAVE_THROWN_JOURNAL_CORRUPT");
  });

  test("same inputs plus same timestamps produce byte-identical journals", () => {
    const build = () => {
      const j = new KernelJournal();
      j.append({ causationId: "det", kind: "trade-computer.emit", payload: { ids: ["EU1"] }, timestampMs: T0 });
      j.append({ causationId: "det", kind: "trade-computer.refuse", payload: { code: "X" }, timestampMs: T0 + 5 });
      return JSON.stringify(j.all());
    };
    expect(build()).toBe(build());
  });
});

describe("SC-16 leg chain journal rows (card→L1→L2→L3→L4→L5)", () => {
  const LEG_KINDS = [
    "trade-computer.leg.card",
    "trade-computer.leg.l1",
    "trade-computer.leg.l2",
    "trade-computer.leg.l3",
    "trade-computer.leg.l4",
    "trade-computer.leg.l5",
  ];

  test("six ordered leg rows per setup queryable by causationId, references resolve, chain intact", () => {
    const causationId = `sc16-chain:${T0}`;
    const journal = new KernelJournal();
    const card = baseCard();
    const verdicts = baseVerdicts();
    const projections = computeTrades(card, verdicts, { journal, timestampMs: T0, causationId });
    expect(projections.length).toBe(1);
    const rows = journal.query(causationId);
    expect(rows.map((r) => r.kind)).toEqual([...LEG_KINDS, "trade-computer.emit"]);
    const zoneIds = (card.zones as Array<{ zoneId: string }>).map((z) => z.zoneId);
    const designationIds = (card.designations as Array<{ id: string }>).map((d) => d.id);
    const setupIds = (card.setups as Array<{ id: string }>).map((s) => s.id);
    const byKind: Record<string, Record<string, unknown>> = Object.fromEntries(
      rows.map((r) => [r.kind, JSON.parse(r.payload) as Record<string, unknown>]),
    );
    const p = projections[0] as NonNullable<(typeof projections)[0]>;
    expect(byKind["trade-computer.leg.card"]).toMatchObject({
      setupId: p.provenance.cardSetupId,
      zoneId: p.provenance.cardZoneId,
      designationId: p.provenance.cardDesignationId,
    });
    expect(byKind["trade-computer.leg.l1"]).toMatchObject({
      setupId: "EU1",
      telescopeZoneId: p.provenance.l1TelescopeZoneId,
    });
    expect(byKind["trade-computer.leg.l2"]).toMatchObject({
      setupId: "EU1",
      pressureZoneId: p.provenance.l2PressureZoneId,
    });
    expect(byKind["trade-computer.leg.l3"]).toMatchObject({
      setupId: "EU1",
      fibTradeId: p.provenance.l3FibTradeId,
    });
    expect(byKind["trade-computer.leg.l4"]).toMatchObject({
      setupId: "EU1",
      dxyInverseZoneId: p.provenance.l4DxyInverseZoneId,
    });
    expect(byKind["trade-computer.leg.l5"]).toMatchObject({
      setupId: "EU1",
      tradeValid: true,
      score: p.provenance.l5Score,
    });
    // Every id reference resolves into the card that produced it.
    expect(setupIds.includes(byKind["trade-computer.leg.card"]?.setupId as string)).toBe(true);
    expect(zoneIds.includes(byKind["trade-computer.leg.card"]?.zoneId as string)).toBe(true);
    expect(designationIds.includes(byKind["trade-computer.leg.card"]?.designationId as string)).toBe(true);
    expect(zoneIds.includes(byKind["trade-computer.leg.l2"]?.pressureZoneId as string)).toBe(true);
    expect(setupIds.includes(byKind["trade-computer.leg.l3"]?.fibTradeId as string)).toBe(true);
    expect(setupIds.includes(byKind["trade-computer.leg.l5"]?.setupId as string)).toBe(true);
    journal.checkIntegrity();
  });

  test("no-journal call path returns identical projections (leg rows are observe-only)", () => {
    const withJournal = new KernelJournal();
    const causationId = `sc16-observe:${T0}`;
    const a = computeTrades(baseCard(), baseVerdicts(), { journal: withJournal, timestampMs: T0, causationId });
    const b = computeTrades(baseCard(), baseVerdicts());
    expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
    expect(withJournal.query(causationId).map((r) => r.kind)).toEqual([...LEG_KINDS, "trade-computer.emit"]);
  });
});
