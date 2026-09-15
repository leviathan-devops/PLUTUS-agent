// src/kernel/l4-cascade.ts — B.W5-L4 CASCADE-VERIFIER (spec B.W5.1 L4 + S-1 B-4/B-5/B-6).
// Pure function: CascadeInput -> CascadeVerdict over the ms-chain-tracker PATTERN
// (requires[] sequencing, forbids[] consumption, detectLoop duplicate-kill) without
// importing the clock-carrying engine — S-7 admits no wall-clock in the core.
// Divergence and mirror-floor legs discharge through the LANDED divergence_le and
// mirror_floor oracles. A trade with NO DXY inverse is the typed CASCADE_NO_INVERSE
// FAIL — loud, never silent. Emits ZONE-ID refs, directions and integer scores only.

import { divergence_le, mirror_floor } from "../../specs/mpse/oracle-registry";

export const DIVERGENCE_MAX = 0.35;
export type CascadePair = "DXY" | "EUR/USD" | "GBP/USD";
export type CascadeDirection = "LONG" | "SHORT";

export interface CascadeDesignation {
  tradeId: string;
  pair: CascadePair;
  direction: CascadeDirection;
  zoneId: string;
}

export interface CascadeTranslation {
  stage: string;
  translationId: string;
}

export interface CascadeInput {
  dxy: CascadeDesignation[];
  eu: CascadeDesignation[];
  gu: CascadeDesignation[];
  translations: CascadeTranslation[];
  divergenceScore: number;
  setupCount: number;
  expectedSetups: number;
}

export interface CascadeInverseRow {
  tradeId: string;
  pair: CascadePair;
  direction: CascadeDirection;
  dxyInverseDirection: CascadeDirection;
  dxyInverseZoneId: string | null;
  inverseExists: boolean;
}

export interface CascadeVerdict {
  perTradeInverseMapping: CascadeInverseRow[];
  divergenceScore: number;
  divergenceFlag: boolean;
  floorCheck: "VALID" | "CONTRADICTED";
}

export type CascadeErrorCode =
  | "CASCADE_NO_INVERSE"
  | "CASCADE_FORBIDDEN_CONSUMPTION"
  | "CASCADE_LOOP_DETECTED"
  | "CASCADE_INVALID_INPUT";

export class CascadeError extends Error {
  readonly code: CascadeErrorCode;
  readonly tradeId: string | null;
  constructor(code: CascadeErrorCode, tradeId: string | null, detail: string) {
    super(`[l4-cascade:${code}] ${detail}`);
    this.name = "CascadeError";
    this.code = code;
    this.tradeId = tradeId;
  }
}

function invert(direction: CascadeDirection): CascadeDirection {
  return direction === "LONG" ? "SHORT" : "LONG";
}

function needDesignations(value: unknown, field: string): CascadeDesignation[] {
  if (!Array.isArray(value)) {
    throw new CascadeError("CASCADE_INVALID_INPUT", null, `field '${field}': expected array, got ${String(value)}`);
  }
  for (const d of value) {
    if (typeof d !== "object" || d === null) {
      throw new CascadeError("CASCADE_INVALID_INPUT", null, `field '${field}[]': expected object`);
    }
    const r = d as Record<string, unknown>;
    for (const k of ["tradeId", "pair", "direction", "zoneId"] as const) {
      if (typeof r[k] !== "string" || (r[k] as string).length === 0) {
        throw new CascadeError("CASCADE_INVALID_INPUT", null, `field '${field}[].${k}': expected non-empty string`);
      }
    }
    if (r["direction"] !== "LONG" && r["direction"] !== "SHORT") {
      throw new CascadeError("CASCADE_INVALID_INPUT", null, `field '${field}[].direction': expected LONG|SHORT`);
    }
  }
  return value as CascadeDesignation[];
}

function detectLoop(translations: CascadeTranslation[]): string | null {
  const seen = new Set<string>();
  for (const t of translations) {
    if (typeof t !== "object" || t === null) {
      throw new CascadeError("CASCADE_INVALID_INPUT", null, "field 'translations[]': expected object");
    }
    const key = `${String((t as CascadeTranslation).stage)}|${String((t as CascadeTranslation).translationId)}`;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

export function computeCascade(input: CascadeInput): CascadeVerdict {
  if (typeof input !== "object" || input === null) {
    throw new CascadeError("CASCADE_INVALID_INPUT", null, "field 'input': expected object");
  }
  const dxy = needDesignations(input.dxy, "dxy");
  const eu = needDesignations(input.eu, "eu");
  const gu = needDesignations(input.gu, "gu");
  if (!Array.isArray(input.translations)) {
    throw new CascadeError("CASCADE_INVALID_INPUT", null, "field 'translations': expected array");
  }
  if (typeof input.divergenceScore !== "number" || !Number.isFinite(input.divergenceScore)) {
    throw new CascadeError("CASCADE_INVALID_INPUT", null, "field 'divergenceScore': expected finite number");
  }

  const looped = detectLoop(input.translations as CascadeTranslation[]);
  if (looped !== null) {
    throw new CascadeError("CASCADE_LOOP_DETECTED", null, `translation re-fire '${looped}' — duplicate killed, stage recorded`);
  }

  const dxyZoneIds = new Set(dxy.map((d) => d.zoneId));
  for (const g of gu) {
    if (dxyZoneIds.has(g.zoneId)) {
      throw new CascadeError(
        "CASCADE_FORBIDDEN_CONSUMPTION",
        g.tradeId,
        `GU trade '${g.tradeId}' consumes raw DXY zone '${g.zoneId}' — GU reads ACTIVE EU mirrors only`,
      );
    }
  }

  const rows: CascadeInverseRow[] = [];
  const lanes: Array<{ pair: CascadePair; list: CascadeDesignation[] }> = [
    { pair: "EUR/USD", list: eu },
    { pair: "GBP/USD", list: gu },
  ];
  for (const lane of lanes) {
    for (const t of lane.list) {
      const want = invert(t.direction);
      const match = dxy.find((d) => d.direction === want);
      if (match === undefined) {
        throw new CascadeError(
          "CASCADE_NO_INVERSE",
          t.tradeId,
          `trade '${t.tradeId}' (${lane.pair} ${t.direction}) has no DXY ${want} inverse — layer FAILS`,
        );
      }
      rows.push({
        tradeId: t.tradeId,
        pair: lane.pair,
        direction: t.direction,
        dxyInverseDirection: want,
        dxyInverseZoneId: match.zoneId,
        inverseExists: true,
      });
    }
  }

  const divGate = divergence_le({ value: input.divergenceScore, bound: DIVERGENCE_MAX, quantum: 1e-9 });
  const floorCheck = mirror_floor({ setupCount: input.setupCount, expectedSetups: input.expectedSetups });

  return {
    perTradeInverseMapping: rows,
    divergenceScore: input.divergenceScore,
    divergenceFlag: divGate === "FIRE",
    floorCheck,
  };
}
