// src/kernel/l3-fib.ts — B.W5-L3 FIB SPIDERWEB (spec B.W5.1 L3, ratios 0.382/0.5/0.618/0.786 + 1.272/1.618/2.618).
// Pure function: FibInput -> FibVerdict. Band geometry enters as numeric input;
// the verdict emits ZONE-ID refs, ratio alignments and integer pip distances only.
// Tolerance-scale comparison is discharged through the LANDED divergence_le oracle.
// Error paths FIRST: every malformed shape throws FibInputError — never silent.

import { quantize, divergence_le } from "../../specs/mpse/oracle-registry";

export const FIB_RETRACEMENTS: readonly number[] = [0.382, 0.5, 0.618, 0.786];
export const FIB_EXTENSIONS: readonly number[] = [1.272, 1.618, 2.618];

export type FibDirection = "LONG" | "SHORT";

export interface FibSwingRef {
  swingZoneId: string;
  loEdge: number;
  hiEdge: number;
}

export interface FibTradeRef {
  tradeId: string;
  entryZoneId: string;
  targetZoneId: string;
  direction: FibDirection;
}

export interface FibBand {
  lo: number;
  hi: number;
}

export interface FibInput {
  swings: FibSwingRef[];
  trades: FibTradeRef[];
  bands: Record<string, FibBand>;
  pip: number;
  tolerancePips: number;
}

export interface FibAlignment {
  tradeId: string;
  swingZoneId: string;
  ratio: number;
  kind: "retracement" | "extension";
  distancePips: number;
  aligned: boolean;
}

export interface FibTradeCheck {
  tradeId: string;
  alignedCount: number;
  entryOk: boolean;
  targetOk: boolean;
}

export interface FibVerdict {
  alignments: FibAlignment[];
  tradeChecks: FibTradeCheck[];
  ratiosUsed: { retracements: number[]; extensions: number[] };
}

export class FibInputError extends Error {
  readonly code = "FIB_INVALID_INPUT";
  readonly field: string;
  constructor(field: string, detail: string) {
    super(`[l3-fib:FIB_INVALID_INPUT] malformed input — field '${field}': ${detail}`);
    this.name = "FibInputError";
    this.field = field;
  }
}

function needTradeId(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new FibInputError(field, `expected non-empty string, got ${String(value)}`);
  }
  return value;
}

function needEdge(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FibInputError(field, `expected finite number, got ${String(value)}`);
  }
  return value;
}

function needDirection(value: unknown): FibDirection {
  if (value !== "LONG" && value !== "SHORT") {
    throw new FibInputError("trades[].direction", `expected LONG|SHORT, got ${String(value)}`);
  }
  return value;
}

function levelFor(kind: "retracement" | "extension", lo: number, hi: number, ratio: number): number {
  const span = hi - lo;
  if (kind === "retracement") return hi - ratio * span;
  return hi + (ratio - 1) * span;
}

export function computeFib(input: FibInput): FibVerdict {
  if (typeof input !== "object" || input === null) throw new FibInputError("input", "expected object");
  if (!Array.isArray(input.swings) || input.swings.length === 0) {
    throw new FibInputError("swings", "expected non-empty swing array");
  }
  if (!Array.isArray(input.trades) || input.trades.length === 0) {
    throw new FibInputError("trades", "expected non-empty trade array");
  }
  if (typeof input.bands !== "object" || input.bands === null || Array.isArray(input.bands)) {
    throw new FibInputError("bands", "expected zone-id keyed band record");
  }
  if (typeof input.pip !== "number" || !Number.isFinite(input.pip) || input.pip <= 0) {
    throw new FibInputError("pip", `expected positive quantum, got ${String(input.pip)}`);
  }
  if (typeof input.tolerancePips !== "number" || !Number.isFinite(input.tolerancePips) || input.tolerancePips < 0) {
    throw new FibInputError("tolerancePips", `expected non-negative integer pips, got ${String(input.tolerancePips)}`);
  }
  if (!Number.isInteger(quantize(input.tolerancePips, 1))) {
    throw new FibInputError("tolerancePips", "expected integer pip count");
  }

  for (const s of input.swings) {
    if (typeof s !== "object" || s === null) throw new FibInputError("swings[]", "expected object");
    needTradeId((s as FibSwingRef).swingZoneId, "swings[].swingZoneId");
    const lo = needEdge((s as FibSwingRef).loEdge, "swings[].loEdge");
    const hi = needEdge((s as FibSwingRef).hiEdge, "swings[].hiEdge");
    if (lo > hi) throw new FibInputError("swings[]", `inverted swing band lo ${String(lo)} > hi ${String(hi)}`);
  }
  for (const t of input.trades) {
    if (typeof t !== "object" || t === null) throw new FibInputError("trades[]", "expected object");
    needTradeId((t as FibTradeRef).tradeId, "trades[].tradeId");
    needTradeId((t as FibTradeRef).entryZoneId, "trades[].entryZoneId");
    needTradeId((t as FibTradeRef).targetZoneId, "trades[].targetZoneId");
    needDirection((t as FibTradeRef).direction);
    const entry = (input.bands as Record<string, FibBand>)[(t as FibTradeRef).entryZoneId];
    if (entry === undefined) {
      throw new FibInputError("bands", `no band for entry zone '${(t as FibTradeRef).entryZoneId}'`);
    }
    const target = (input.bands as Record<string, FibBand>)[(t as FibTradeRef).targetZoneId];
    if (target === undefined) {
      throw new FibInputError("bands", `no band for target zone '${(t as FibTradeRef).targetZoneId}'`);
    }
    for (const [label, band] of [["entry", entry], ["target", target]] as const) {
      const lo = needEdge(band.lo, `bands.${label}.lo`);
      const hi = needEdge(band.hi, `bands.${label}.hi`);
      if (lo > hi) throw new FibInputError("bands", `inverted ${label} band for zone`);
    }
  }

  const verdict: FibVerdict = {
    alignments: [],
    tradeChecks: [],
    ratiosUsed: { retracements: [...FIB_RETRACEMENTS], extensions: [...FIB_EXTENSIONS] },
  };

  for (const t of input.trades as FibTradeRef[]) {
    const entryBand = (input.bands as Record<string, FibBand>)[t.entryZoneId] as FibBand;
    const targetBand = (input.bands as Record<string, FibBand>)[t.targetZoneId] as FibBand;
    const entryEdge = t.direction === "LONG" ? entryBand.lo : entryBand.hi;
    const targetEdge = t.direction === "LONG" ? targetBand.hi : targetBand.lo;
    let alignedCount = 0;
    let targetBeyond = false;

    for (const s of input.swings as FibSwingRef[]) {
      const kinds: Array<"retracement" | "extension"> = ["retracement", "extension"];
      for (const kind of kinds) {
        const ratios = kind === "retracement" ? FIB_RETRACEMENTS : FIB_EXTENSIONS;
        for (const ratio of ratios) {
          const level = levelFor(kind, s.loEdge, s.hiEdge, ratio);
          const distancePips = Math.abs(quantize(entryEdge, input.pip) - quantize(level, input.pip));
          const gate = divergence_le({ value: distancePips, bound: input.tolerancePips, quantum: 1 });
          const aligned = gate === "SILENT";
          if (aligned) alignedCount += 1;
          verdict.alignments.push({
            tradeId: t.tradeId,
            swingZoneId: s.swingZoneId,
            ratio,
            kind,
            distancePips,
            aligned,
          });
          if (kind === "extension" && ratio === 1.272) {
            const extLevel = quantize(level, input.pip);
            const tEdge = quantize(targetEdge, input.pip);
            if (t.direction === "LONG" ? tEdge >= extLevel : tEdge <= extLevel) targetBeyond = true;
          }
        }
      }
    }

    verdict.tradeChecks.push({
      tradeId: t.tradeId,
      alignedCount,
      entryOk: alignedCount > 0,
      targetOk: targetBeyond,
    });
  }

  return verdict;
}
