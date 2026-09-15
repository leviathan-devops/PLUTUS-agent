// src/kernel/card-loader.test.ts — the loader trust-boundary battery.
// Every negative asserts err.code (=== CARD_*), never a message substring.
// Each test FAILS if the loader is wrong: corrupt JSON must not parse,
// schema violations must not coerce, orphans must not resolve, and a card
// missing one provenance anchor must not load.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { loadCard, LoadError, isLoadError, type LoadErrorCode } from "./card-loader";

const GOLDEN_URL = new URL("../card/golden-card.json", import.meta.url);

function loadGoldenObject(): Record<string, unknown> {
  const text = readFileSync(GOLDEN_URL, "utf8");
  const data: unknown = JSON.parse(text);
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("golden-card.json root must be an object");
  }
  return data as Record<string, unknown>;
}

function loadGoldenText(): string {
  return readFileSync(GOLDEN_URL, "utf8");
}

function clone(data: Record<string, unknown>): any {
  return structuredClone(data);
}

function expectLoadError(fn: () => unknown, code: LoadErrorCode): LoadError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(LoadError);
    expect(isLoadError(error)).toBe(true);
    const loadError = error as LoadError;
    expect(loadError.name).toBe("LoadError");
    expect(loadError.code).toBe(code);
    return loadError;
  }
  throw new Error(`expected LoadError ${code} — the loader returned a card instead (theatrical)`);
}

describe("card-loader golden load", () => {
  test("golden-card.json object loads clean to a typed PlutusCard", () => {
    const card = loadCard(loadGoldenObject());
    expect(card.meta.pair).toBe("EUR/USD");
    expect(card.meta.analysisPointMs).toBe(1783317600000);
    expect(card.zones.length).toBe(3);
    expect(card.designations.length).toBe(2);
    expect(card.setups.length).toBe(1);
    expect(card.grounding.forwardPosition).toBe(12.5);
  });

  test("golden-card.json raw string loads clean (JSON.parse layer)", () => {
    const card = loadCard(loadGoldenText());
    expect(card.meta.pair).toBe("EUR/USD");
    expect(card.zones.length).toBe(3);
  });
});

describe("card-loader negatives (typed loud LoadErrors)", () => {
  test("corrupt JSON string FAILS with CARD_JSON_CORRUPT (never a raw SyntaxError)", () => {
    const error = expectLoadError(
      () => loadCard('{"meta": {"pair": "EUR/USD", broken,,,'),
      "CARD_JSON_CORRUPT",
    );
    expect(error.issues.length).toBe(0);
  });

  test("empty string FAILS with CARD_JSON_CORRUPT", () => {
    expectLoadError(() => loadCard(""), "CARD_JSON_CORRUPT");
  });

  test("schema-violating object FAILS with CARD_SCHEMA_INVALID + the zod issues list", () => {
    const mutant = clone(loadGoldenObject());
    delete (mutant as Record<string, unknown>)["meta"];
    const error = expectLoadError(() => loadCard(mutant), "CARD_SCHEMA_INVALID");
    expect(error.issues.length).toBeGreaterThan(0);
  });

  test("null input FAILS with CARD_SCHEMA_INVALID (never a crash)", () => {
    expectLoadError(() => loadCard(null), "CARD_SCHEMA_INVALID");
  });

  test("orphan supplyZoneId FAILS with CARD_ORPHAN_ID", () => {
    const mutant = clone(loadGoldenObject());
    mutant.designations[0].supplyZoneId = "EUR/USD|1H|0000000000000|9.99999";
    expectLoadError(() => loadCard(mutant), "CARD_ORPHAN_ID");
  });

  test("provenance-incomplete card FAILS with CARD_PROVENANCE_INCOMPLETE (the schema CARD_PROVENANCE_MISSING alias)", () => {
    const mutant = clone(loadGoldenObject());
    mutant.provenance.entries = (mutant.provenance.entries as unknown[]).slice(1);
    const error = expectLoadError(() => loadCard(mutant), "CARD_PROVENANCE_INCOMPLETE");
    expect(error.issues.length).toBeGreaterThan(0);
  });
});
