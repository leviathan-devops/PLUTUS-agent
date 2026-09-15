// src/card/types.ts — the Wave-2 consumer import surface (LEAD-desk contract).
//
// Single source of truth: every structural type is z.infer of the schema in
// ./schema.ts — this file RE-EXPORTS them under consumer-stable names plus the
// handwritten parse/error types. Wave 2 desks (assembler, card-loader,
// trade-computer) import from "./types.ts" (types) + "./schema.ts" (schemas +
// parse helpers). A type change here ripples to all three consumers.

import type { z } from "zod";
import type {
  CardSchema,
  MetaSchema,
  ZoneRefSchema,
  DesignationRefSchema,
  ChartRefSchema,
  VisualsSchema,
  SetupSchema,
  ProvenanceSchema,
  ProvenanceEntrySchema,
  GroundingSchema,
  CardParseResult,
  CardParseSuccess,
  CardParseFailure,
  CardErrorCode,
} from "./schema.ts";

export type PlutusCard = z.infer<typeof CardSchema>;
export type CardMeta = z.infer<typeof MetaSchema>;
export type ZoneRef = z.infer<typeof ZoneRefSchema>;
export type DesignationRef = z.infer<typeof DesignationRefSchema>;
export type ChartRef = z.infer<typeof ChartRefSchema>;
export type CardVisuals = z.infer<typeof VisualsSchema>;
export type CardSetup = z.infer<typeof SetupSchema>;
export type CardProvenance = z.infer<typeof ProvenanceSchema>;
export type ProvenanceEntry = z.infer<typeof ProvenanceEntrySchema>;
export type CardGrounding = z.infer<typeof GroundingSchema>;

export type {
  CardParseResult,
  CardParseSuccess,
  CardParseFailure,
  CardErrorCode,
};

export type { CardError } from "./schema.ts";

export type CardPair = PlutusCard["meta"]["pair"];
export type CardTimeframe = PlutusCard["meta"]["tf"];
export type CardDirection = DesignationRef["direction"];

/** All zoneIds referenced by a card — the SC-14 traceability surface. */
export interface CardIdInventory {
  readonly zoneIds: readonly string[];
  readonly designationIds: readonly string[];
  readonly setupIds: readonly string[];
  readonly chartPaths: readonly string[];
  readonly provenanceIds: readonly string[];
}

/** Collect every id a card references (computed from the card — never fitted). */
export function inventoryCardIds(card: PlutusCard): CardIdInventory {
  return {
    zoneIds: card.zones.map((zone) => zone.zoneId),
    designationIds: card.designations.map((designation) => designation.id),
    setupIds: card.setups.map((setup) => setup.id),
    chartPaths: card.visuals.charts.map((chart) => chart.path),
    provenanceIds: card.provenance.entries.map((entry) => entry.id),
  };
}
