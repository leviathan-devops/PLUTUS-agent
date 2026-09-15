// src/card/schema.test.ts — plutus-card-v1 adversarial battery.
// Every test FAILS if the code is wrong: the golden PASS proves the schema
// accepts the contract shape; each negative proves a distinct typed loud FAIL.

import { describe, expect, test } from "bun:test";
import { CardError, safeParsePlutusCard, parsePlutusCard } from "./schema.ts";
import { inventoryCardIds } from "./types.ts";

const GOLDEN_URL = new URL("./golden-card.json", import.meta.url);

async function loadGolden(): Promise<Record<string, unknown>> {
  const data: unknown = await Bun.file(GOLDEN_URL).json();
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new CardError("CARD_SCHEMA_INVALID", "golden-card.json root must be an object");
  }
  return data as Record<string, unknown>;
}

function clone(data: Record<string, unknown>): any {
  return structuredClone(data);
}

describe("plutus-card-v1 golden fixture", () => {
  test("golden-card.json parses clean with 3 zones / 2 designations / 1 setup", async () => {
    const golden = await loadGolden();
    const result = safeParsePlutusCard(golden);
    if (!result.ok) {
      throw new Error(`golden fixture REJECTED: ${result.error.message}`);
    }
    expect(result.card.zones.length).toBe(3);
    expect(result.card.designations.length).toBe(2);
    expect(result.card.setups.length).toBe(1);
    expect(result.card.visuals.charts.length).toBe(2);
    expect(result.card.meta.pair).toBe("EUR/USD");
    expect(result.card.grounding.forwardPosition).toBe(12.5);
    const inventory = inventoryCardIds(result.card);
    expect(inventory.provenanceIds.length).toBe(8);
  });

  test("parsePlutusCard throwing path returns the card on valid input", async () => {
    const golden = await loadGolden();
    const card = parsePlutusCard(golden);
    expect(card.meta.analysisPointMs).toBe(1783317600000);
  });
});

describe("plutus-card-v1 negatives (typed loud FAILs)", () => {
  test("orphan supplyZoneId FAILS with CARD_ORPHAN_ID", async () => {
    const mutant = clone(await loadGolden());
    mutant.designations[0].supplyZoneId = "EUR/USD|1H|0000000000000|9.99999";
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("orphan zoneId COERCED to pass — theatrical");
    expect(result.error).toBeInstanceOf(CardError);
    expect(result.error.code).toBe("CARD_ORPHAN_ID");
  });

  test("orphan setup zoneId FAILS with CARD_ORPHAN_ID", async () => {
    const mutant = clone(await loadGolden());
    mutant.setups[0].zoneId = "GBP/USD|1H|0000000000000|9.99999";
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("orphan setup zoneId COERCED to pass — theatrical");
    expect(result.error.code).toBe("CARD_ORPHAN_ID");
  });

  test("price field in a zone slot FAILS with CARD_PRICE_SLOT", async () => {
    const mutant = clone(await loadGolden());
    mutant.zones[0].price = 1.1446;
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("price slot COERCED to pass — SC-7 breach");
    expect(result.error.code).toBe("CARD_PRICE_SLOT");
  });

  test("entry/sl/tp smuggled into a setup FAILS with CARD_PRICE_SLOT", async () => {
    const mutant = clone(await loadGolden());
    mutant.setups[0].entry = 1.1446;
    mutant.setups[0].sl = 1.146;
    mutant.setups[0].tp = 1.141;
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("trade numbers COERCED to pass — SC-7 breach");
    expect(result.error.code).toBe("CARD_PRICE_SLOT");
  });

  test("FAIL-grade chart FAILS assembly input with CARD_CHART_GRADE", async () => {
    const mutant = clone(await loadGolden());
    mutant.visuals.charts[0].grade = "FAIL";
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("FAIL-grade chart COERCED to pass — unvetted visual in card");
    expect(result.error.code).toBe("CARD_CHART_GRADE");
  });

  test("missing chart grade FAILS assembly input with CARD_CHART_GRADE", async () => {
    const mutant = clone(await loadGolden());
    delete mutant.visuals.charts[1].grade;
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("missing grade COERCED to pass — unvetted visual in card");
    expect(result.error.code).toBe("CARD_CHART_GRADE");
  });

  test("W-1: non-numeric forwardPosition FAILS with CARD_W1_NON_NUMERIC", async () => {
    const mutant = clone(await loadGolden());
    mutant.grounding.forwardPosition = "twelve pips";
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("non-numeric forward position COERCED to pass — W-1 disarmed");
    expect(result.error.code).toBe("CARD_W1_NON_NUMERIC");
  });

  test("missing provenance anchor FAILS with CARD_PROVENANCE_MISSING", async () => {
    const mutant = clone(await loadGolden());
    mutant.provenance.entries = mutant.provenance.entries.filter(
      (entry: any) => entry.id !== "setup-eu-tue-short-1",
    );
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unanchored id COERCED to pass — SC-14 breach");
    expect(result.error.code).toBe("CARD_PROVENANCE_MISSING");
  });

  test("null root FAILS with CARD_SCHEMA_INVALID (never throws raw)", async () => {
    const result = safeParsePlutusCard(null);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("null root COERCED to pass");
    expect(result.error.code).toBe("CARD_SCHEMA_INVALID");
  });

  test("empty zones array FAILS (boundary: a card with no zones is not a card)", async () => {
    const mutant = clone(await loadGolden());
    mutant.zones = [];
    const result = safeParsePlutusCard(mutant);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("empty zones COERCED to pass");
  });
});
