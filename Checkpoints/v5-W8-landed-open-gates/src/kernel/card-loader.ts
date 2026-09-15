// src/kernel/card-loader.ts — the kernel trust boundary (Wave 2 consumer desk).
//
// Kernel=CODE: nothing unvalidated crosses this loader. STRICT pipeline order:
// (1) JSON.parse if string → CARD_JSON_CORRUPT (never a raw SyntaxError);
// (2) schema-validate via the LANDED src/card CardSchema → typed failure with
// the zod issues list (safeParsePlutusCard never throws);
// (3) orphan-id check via inventoryCardIds() → CARD_ORPHAN_ID;
// (4) provenance completeness check → CARD_PROVENANCE_INCOMPLETE.
// THEN return the typed card. Zero silent degrade: every failure is a named
// LoadError with context; a partial card is never returned.
//
// TAXONOMY RECONCILIATION (binding): the schema's CardErrorCode union is
// CARD_SCHEMA_INVALID | CARD_ORPHAN_ID | CARD_PRICE_SLOT | CARD_CHART_GRADE |
// CARD_W1_NON_NUMERIC | CARD_PROVENANCE_MISSING — it has NO CARD_JSON_CORRUPT
// and NO CARD_PROVENANCE_INCOMPLETE. This loader's LoadErrorCode is the schema
// union PLUS the two loader-level codes, with ONE alias: wherever the schema
// emits CARD_PROVENANCE_MISSING the loader emits CARD_PROVENANCE_INCOMPLETE
// (the loader-level name for the same condition — asserted in
// card-loader.test.ts). CARD_PRICE_SLOT / CARD_CHART_GRADE / CARD_W1_NON_NUMERIC
// propagate VERBATIM — never remapped to CARD_SCHEMA_INVALID. CARD_ORPHAN_ID
// likewise propagates verbatim (schema layer and loader layer agree on it).
//
// Consumed by w5-trade-computer via `import { loadCard, LoadError } from
// "./card-loader.ts"` — the L4-of-chain wiring (SC-16 provenance starts here).

import type { z } from "zod";
import {
  CardError,
  safeParsePlutusCard,
  type CardErrorCode,
} from "../card/schema";
import { inventoryCardIds, type PlutusCard } from "../card/types";

export type { PlutusCard };

/**
 * Loader-level error codes: the full schema code union (propagated verbatim)
 * plus the two codes only the loader can emit. The single alias:
 * CARD_PROVENANCE_MISSING (schema) → CARD_PROVENANCE_INCOMPLETE (loader).
 */
export type LoadErrorCode =
  | CardErrorCode
  | "CARD_JSON_CORRUPT"
  | "CARD_PROVENANCE_INCOMPLETE";

export class LoadError extends Error {
  readonly code: LoadErrorCode;
  readonly issues: readonly z.ZodIssue[];
  constructor(code: LoadErrorCode, message: string, issues: readonly z.ZodIssue[] = []) {
    super(`[${code}] ${message}`);
    this.name = "LoadError";
    this.code = code;
    this.issues = issues;
  }
}

export function isLoadError(error: unknown): error is LoadError {
  return error instanceof LoadError;
}

function toLoadError(error: CardError, issues: readonly z.ZodIssue[]): LoadError {
  if (error.code === "CARD_PROVENANCE_MISSING") {
    return new LoadError(
      "CARD_PROVENANCE_INCOMPLETE",
      `id(s) without a provenance source anchor — every inventoried id traces to a source (SC-14): ${error.message}`,
      issues,
    );
  }
  return new LoadError(error.code, error.message, issues);
}

/**
 * Load + trust-gate a plutus-card-v1 card. Error paths FIRST, happy path LAST.
 * Never throws a raw SyntaxError; never returns a partial card.
 */
export function loadCard(raw: unknown): PlutusCard {
  let data: unknown = raw;
  if (typeof raw === "string") {
    if (raw.length === 0) {
      throw new LoadError("CARD_JSON_CORRUPT", "card input is an empty string — nothing to parse");
    }
    try {
      data = JSON.parse(raw);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new LoadError("CARD_JSON_CORRUPT", `card JSON is corrupt and unparseable: ${detail}`);
    }
  } else if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new LoadError(
      "CARD_SCHEMA_INVALID",
      `card root must be an object or a JSON string (got ${Array.isArray(data) ? "array" : data === null ? "null" : typeof data})`,
    );
  }
  const parsed = safeParsePlutusCard(data);
  if (!parsed.ok) {
    throw toLoadError(parsed.error, parsed.issues);
  }
  const card = parsed.card;
  assertNoOrphans(card);
  assertProvenanceComplete(card);
  return card;
}

/**
 * Layer 3 — orphan-id check against the card's own inventory (computed from the
 * card via inventoryCardIds(), never fitted): every designation/setup zone ref
 * must resolve to a zones[] zoneId. The schema already enforces this; this
 * layer is defense-in-depth so a future schema relaxation cannot leak a
 * dangling ref into the kernel. Loud CARD_ORPHAN_ID, never a skip.
 */
function assertNoOrphans(card: PlutusCard): void {
  const inventory = inventoryCardIds(card);
  const zoneIds = new Set<string>(inventory.zoneIds);
  for (const designation of card.designations) {
    if (!zoneIds.has(designation.supplyZoneId)) {
      throw new LoadError(
        "CARD_ORPHAN_ID",
        `designation '${designation.id}' supplyZoneId '${designation.supplyZoneId}' resolves to no zones[] entry (loader orphan layer)`,
      );
    }
    if (!zoneIds.has(designation.demandZoneId)) {
      throw new LoadError(
        "CARD_ORPHAN_ID",
        `designation '${designation.id}' demandZoneId '${designation.demandZoneId}' resolves to no zones[] entry (loader orphan layer)`,
      );
    }
  }
  for (const setup of card.setups) {
    if (!zoneIds.has(setup.zoneId)) {
      throw new LoadError(
        "CARD_ORPHAN_ID",
        `setup '${setup.id}' zoneId '${setup.zoneId}' resolves to no zones[] entry (loader orphan layer)`,
      );
    }
  }
}

/**
 * Layer 4 — provenance completeness against the card's own inventory: every
 * inventoried id (zones, designations, setups, chart paths) must carry a
 * provenance source anchor. The schema emits CARD_PROVENANCE_MISSING here;
 * the loader names it CARD_PROVENANCE_INCOMPLETE (the alias above).
 */
function assertProvenanceComplete(card: PlutusCard): void {
  const inventory = inventoryCardIds(card);
  const anchored = new Set<string>(inventory.provenanceIds);
  const required: readonly string[] = [
    ...inventory.zoneIds,
    ...inventory.designationIds,
    ...inventory.setupIds,
    ...inventory.chartPaths,
  ];
  for (const id of required) {
    if (!anchored.has(id)) {
      throw new LoadError(
        "CARD_PROVENANCE_INCOMPLETE",
        `id '${id}' has no provenance anchor — every id traces to a source (SC-14, loader provenance layer)`,
      );
    }
  }
}
