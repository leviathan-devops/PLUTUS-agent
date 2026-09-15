// src/card/assembler.ts — Wave 2 consumer desk: assemble() -> PlutusCard.
//
// Shape authority: plutus-card-v1 per src/card/schema.ts (CardSchema) —
// meta / zones / designations / visuals.charts / setups / provenance /
// grounding. Provisional labels (ZoneSnapshot / reasoning stepA-stepB) lose
// to the files: assemble ONLY the plutus-card-v1 shape.
// Gate order (error paths FIRST): FAIL-chart refusal (W3.5 binary gate
// lineage — nothing unvetted reaches the card) -> orphan-id -> provenance
// completeness -> CardSchema parse. A refusal is a typed AssemblerError,
// never a coerced pass.

import { safeParsePlutusCard, type CardError } from "./schema.ts";
import type { CardProvenance, PlutusCard } from "./types.ts";
import { AssemblerError, assertProvenanceComplete } from "./provenance.ts";
import type { AssemblerErrorCode } from "./provenance.ts";

export { AssemblerError };
export type { AssemblerErrorCode };

function mapCardError(error: CardError): AssemblerError {
  switch (error.code) {
    case "CARD_CHART_GRADE":
      return new AssemblerError("CHART_FAIL", error.message);
    case "CARD_ORPHAN_ID":
      return new AssemblerError("ORPHAN_ID", error.message);
    case "CARD_PROVENANCE_MISSING":
      return new AssemblerError("PROVENANCE_INCOMPLETE", error.message);
    case "CARD_PRICE_SLOT":
      return new AssemblerError("PRICE_SLOT", error.message);
    default:
      return new AssemblerError("SCHEMA_INVALID", error.message);
  }
}

function zoneIdSet(root: Record<string, unknown>): Set<string> | null {
  if (!Array.isArray(root["zones"])) return null;
  const ids = new Set<string>();
  for (const zone of root["zones"] as unknown[]) {
    if (zone === null || typeof zone !== "object") return null;
    const zoneId = (zone as Record<string, unknown>)["zoneId"];
    if (typeof zoneId !== "string") return null;
    ids.add(zoneId);
  }
  return ids;
}

function chartEntries(root: Record<string, unknown>): unknown[] | null {
  const visuals = root["visuals"];
  if (visuals === null || typeof visuals !== "object") return null;
  const charts = (visuals as Record<string, unknown>)["charts"];
  return Array.isArray(charts) ? (charts as unknown[]) : null;
}

function requiredCardIds(root: Record<string, unknown>, zones: Set<string>): string[] | null {
  try {
    const ids: string[] = [...zones];
    const designations = root["designations"];
    if (!Array.isArray(designations)) return null;
    for (const raw of designations as unknown[]) {
      if (raw === null || typeof raw !== "object") return null;
      const id = (raw as Record<string, unknown>)["id"];
      if (typeof id !== "string") return null;
      ids.push(id);
    }
    const setups = root["setups"];
    if (!Array.isArray(setups)) return null;
    for (const raw of setups as unknown[]) {
      if (raw === null || typeof raw !== "object") return null;
      const id = (raw as Record<string, unknown>)["id"];
      if (typeof id !== "string") return null;
      ids.push(id);
    }
    const charts = chartEntries(root);
    if (charts === null) return null;
    for (const raw of charts) {
      if (raw === null || typeof raw !== "object") return null;
      const path = (raw as Record<string, unknown>)["path"];
      if (typeof path !== "string") return null;
      ids.push(path);
    }
    return ids;
  } catch {
    return null;
  }
}

export function assemble(input: unknown): PlutusCard {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new AssemblerError(
        "SCHEMA_INVALID",
        "card root must be an object (got null/array/non-object)",
      );
    }
    const root = input as Record<string, unknown>;

    const charts = chartEntries(root);
    if (charts !== null) {
      for (let i = 0; i < charts.length; i++) {
        const chart = charts[i] as Record<string, unknown>;
        const grade =
          chart !== null && typeof chart === "object"
            ? (chart as Record<string, unknown>)["grade"]
            : undefined;
        if (grade !== "PASS") {
          throw new AssemblerError(
            "CHART_FAIL",
            `visuals.charts[${i}] grade '${String(grade)}' refused — nothing unvetted reaches the card (W3.5 binary gate lineage)`,
          );
        }
      }
    }

    const zones = zoneIdSet(root);
    if (zones !== null) {
      const designations = root["designations"];
      if (Array.isArray(designations)) {
        for (let i = 0; i < (designations as unknown[]).length; i++) {
          const raw = (designations as unknown[])[i] as Record<string, unknown>;
          if (raw === null || typeof raw !== "object") continue;
          for (const key of ["supplyZoneId", "demandZoneId"] as const) {
            const ref = raw[key];
            if (typeof ref === "string" && !zones.has(ref)) {
              throw new AssemblerError(
                "ORPHAN_ID",
                `designations[${i}].${key} '${ref}' is not in zones[] — orphan ids are a typed loud FAIL`,
              );
            }
          }
        }
      }
      const setups = root["setups"];
      if (Array.isArray(setups)) {
        for (let i = 0; i < (setups as unknown[]).length; i++) {
          const raw = (setups as unknown[])[i] as Record<string, unknown>;
          if (raw === null || typeof raw !== "object") continue;
          const ref = raw["zoneId"];
          const id = raw["id"];
          if (typeof ref === "string" && !zones.has(ref)) {
            throw new AssemblerError(
              "ORPHAN_ID",
              `setups[${i}] id '${String(id)}' zoneId '${ref}' is not in zones[] — orphan ids are a typed loud FAIL`,
            );
          }
        }
      }
    }

    const provRaw = (root["provenance"] as Record<string, unknown> | undefined)?.["entries"];
    if (!Array.isArray(provRaw)) {
      throw new AssemblerError(
        "PROVENANCE_INCOMPLETE",
        "provenance.entries must be a non-empty array — every card id traces to a source (SC-14)",
      );
    }
    const provenance = { entries: provRaw } as CardProvenance;
    const sourceRe = /^.+:\d+/;
    for (let i = 0; i < provenance.entries.length; i++) {
      const entry = provenance.entries[i] as {
        id?: unknown;
        source?: unknown;
      };
      if (entry === null || typeof entry !== "object") {
        throw new AssemblerError(
          "PROVENANCE_INCOMPLETE",
          `provenance.entries[${i}] must be an object — never auto-filled`,
        );
      }
      if (typeof entry.source !== "string" || entry.source.length === 0) {
        throw new AssemblerError(
          "PROVENANCE_INCOMPLETE",
          `provenance.entries[${i}] id '${String(entry.id)}' has no source — every card id is machine-traceable (SC-14)`,
        );
      }
      if (!sourceRe.test(entry.source)) {
        throw new AssemblerError(
          "PROVENANCE_INCOMPLETE",
          `provenance.entries[${i}] id '${String(entry.id)}' source '${entry.source}' is not a file:line anchor`,
        );
      }
    }
    if (zones !== null) {
      const required = requiredCardIds(root, zones);
      if (required !== null) {
        assertProvenanceComplete(required, provenance);
      }
    }

    const result = safeParsePlutusCard(input);
    if (!result.ok) {
      throw mapCardError(result.error);
    }
    return result.card;
  } catch (error) {
    if (error instanceof AssemblerError) {
      throw error;
    }
    throw new AssemblerError(
      "SCHEMA_INVALID",
      `assemble raised a non-assembler error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
