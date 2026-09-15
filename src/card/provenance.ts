// src/card/provenance.ts — SC-14 traceability builder (Wave 2 consumer desk).
//
// Every card id (zoneId / designationId / setupId / chart path) traces to a
// source anchor. An id without a source is a typed loud FAIL, never auto-filled.
// Kind vocabulary: PROVENANCE_KINDS in ./schema.ts (e1-zone | e2-designation |
// chart | setup | grounding). Golden vocabulary proof: golden-card.json:42-84.

import { PROVENANCE_KINDS } from "./schema.ts";
import type { CardProvenance, ProvenanceEntry } from "./types.ts";

export type ProvenanceKind = (typeof PROVENANCE_KINDS)[number];

export type AssemblerErrorCode =
  | "CHART_FAIL"
  | "ORPHAN_ID"
  | "PROVENANCE_INCOMPLETE"
  | "SCHEMA_INVALID"
  | "PRICE_SLOT";

export class AssemblerError extends Error {
  readonly code: AssemblerErrorCode;
  constructor(code: AssemblerErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "AssemblerError";
    this.code = code;
  }
}

export interface ProvenanceInput {
  readonly id: string;
  readonly source: string;
  readonly kind: ProvenanceKind;
  readonly value?: number;
}

const SOURCE_RE = /^.+:\d+/;

function isProvenanceKind(value: unknown): value is ProvenanceKind {
  return (
    typeof value === "string" &&
    (PROVENANCE_KINDS as readonly string[]).includes(value)
  );
}

export function buildProvenance(inputs: unknown): CardProvenance {
  if (!Array.isArray(inputs)) {
    throw new AssemblerError(
      "PROVENANCE_INCOMPLETE",
      `provenance inputs must be an array (got ${inputs === null ? "null" : typeof inputs}) — SC-14: every id traces to a source`,
    );
  }
  if (inputs.length === 0) {
    throw new AssemblerError(
      "PROVENANCE_INCOMPLETE",
      "provenance inputs must carry at least one anchor — empty provenance is a loud FAIL",
    );
  }
  const entries: ProvenanceEntry[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < inputs.length; i++) {
    const raw = inputs[i] as Partial<ProvenanceInput>;
    if (raw === null || typeof raw !== "object") {
      throw new AssemblerError(
        "PROVENANCE_INCOMPLETE",
        `provenance[${i}] must be an object — SC-14: no auto-filled anchors`,
      );
    }
    if (typeof raw.id !== "string" || raw.id.length === 0) {
      throw new AssemblerError(
        "PROVENANCE_INCOMPLETE",
        `provenance[${i}].id must be a non-empty string — an id without identity is a loud FAIL`,
      );
    }
    if (typeof raw.source !== "string" || raw.source.length === 0) {
      throw new AssemblerError(
        "PROVENANCE_INCOMPLETE",
        `provenance[${i}] id '${raw.id}' has no source — every card id is machine-traceable (SC-14), never auto-filled`,
      );
    }
    if (!SOURCE_RE.test(raw.source)) {
      throw new AssemblerError(
        "PROVENANCE_INCOMPLETE",
        `provenance[${i}] id '${raw.id}' source '${raw.source}' is not a file:line anchor (e.g. src/e1/actors/zone-map.ts:88)`,
      );
    }
    if (!isProvenanceKind(raw.kind)) {
      throw new AssemblerError(
        "PROVENANCE_INCOMPLETE",
        `provenance[${i}] id '${raw.id}' kind '${String(raw.kind)}' must be ${(PROVENANCE_KINDS as readonly string[]).join(" | ")}`,
      );
    }
    if (raw.value !== undefined) {
      if (typeof raw.value !== "number" || !Number.isFinite(raw.value)) {
        throw new AssemblerError(
          "PROVENANCE_INCOMPLETE",
          `provenance[${i}] id '${raw.id}' value must be a finite number when present`,
        );
      }
    }
    if (seen.has(raw.id)) {
      throw new AssemblerError(
        "PROVENANCE_INCOMPLETE",
        `provenance[${i}] duplicate id '${raw.id}' — one anchor per id`,
      );
    }
    seen.add(raw.id);
    const entry: ProvenanceEntry =
      raw.value === undefined
        ? { id: raw.id, source: raw.source, kind: raw.kind }
        : { id: raw.id, source: raw.source, kind: raw.kind, value: raw.value };
    entries.push(entry);
  }
  return { entries };
}

export function assertProvenanceComplete(
  requiredIds: readonly string[],
  provenance: CardProvenance,
): void {
  if (!Array.isArray(requiredIds)) {
    throw new AssemblerError(
      "PROVENANCE_INCOMPLETE",
      "requiredIds must be an array — computed from the card, never fitted",
    );
  }
  const anchored = new Set(provenance.entries.map((entry) => entry.id));
  for (const id of requiredIds) {
    if (!anchored.has(id)) {
      throw new AssemblerError(
        "PROVENANCE_INCOMPLETE",
        `id '${id}' has no provenance anchor — every card id traces to a source (SC-14)`,
      );
    }
  }
}
