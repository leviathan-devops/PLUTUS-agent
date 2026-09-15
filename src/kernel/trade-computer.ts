import type { PlutusCard } from "../card/schema";
import type { TelescopeVerdict } from "./l1-telescope";
import type { PressureVerdict } from "./l2-pressure";
import type { FibVerdict } from "./l3-fib";
import type { CascadeVerdict } from "./l4-cascade";
import type { TiVerdict } from "./l5-ti-graph";
import type { KernelJournal } from "./journal";

export const RRR_FLOOR = 2.5;

export type TradePair = PlutusCard["meta"]["pair"];
export type TradeDirection = PlutusCard["setups"][number]["direction"];

export interface TradeComputerVerdicts {
  l1: TelescopeVerdict;
  l2: PressureVerdict;
  l3: FibVerdict;
  l4: CascadeVerdict;
  l5: TiVerdict;
}

export interface TradeProjectionMetaLayerVerdicts {
  L1: TelescopeVerdict;
  L2: PressureVerdict;
  L3: FibVerdict;
  L4: CascadeVerdict;
  L5: TiVerdict;
}

export interface TradeProjectionProvenance {
  cardSetupId: string;
  cardZoneId: string;
  cardDesignationId: string;
  l1TelescopeZoneId: string | null;
  l2PressureZoneId: string;
  l3FibTradeId: string;
  l4DxyInverseZoneId: string | null;
  l5Score: number;
}

export interface TradeProjection {
  id: string;
  pair: TradePair;
  direction: TradeDirection;
  entryZoneRef: string;
  slZoneRef: string;
  tpZoneRef: string;
  rr: number;
  metaLayerVerdicts: TradeProjectionMetaLayerVerdicts;
  provenance: TradeProjectionProvenance;
}

export type TradeComputerErrorCode =
  | "TRADE_COMPUTER_INVALID_CARD"
  | "TRADE_COMPUTER_INVALID_VERDICTS"
  | "TRADE_COMPUTER_INVALID_INPUT"
  | "TRADE_COMPUTER_PROVENANCE_INCOMPLETE"
  | "TRADE_COMPUTER_CASCADE_FAIL"
  | "TRADE_COMPUTER_FIB_MISMATCH"
  | "TRADE_COMPUTER_CONFLUENCE_FAIL"
  | "RRR_FLOOR_VIOLATION";

export class TradeComputerError extends Error {
  readonly code: TradeComputerErrorCode;
  readonly tradeId: string | null;
  constructor(code: TradeComputerErrorCode, tradeId: string | null, detail: string) {
    super(`[trade-computer:${code}] ${detail}`);
    this.name = "TradeComputerError";
    this.code = code;
    this.tradeId = tradeId;
  }
}

export interface ComputeTradesOptions {
  journal?: KernelJournal;
  timestampMs?: number;
  causationId?: string;
}

interface CandidateLink {
  setupId: string;
  zoneId: string;
  direction: TradeDirection;
  rr: number;
  designationId: string;
  slZoneRef: string;
  tpZoneRef: string;
  l1TelescopeZoneId: string | null;
  l4DxyInverseZoneId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function computeTrades(
  card: PlutusCard,
  verdicts: TradeComputerVerdicts,
  options: ComputeTradesOptions = {},
): TradeProjection[] {
  const journal = options.journal ?? null;
  if (journal !== null) {
    if (options.timestampMs === undefined || typeof options.timestampMs !== "number" || !Number.isFinite(options.timestampMs)) {
      throw new TradeComputerError(
        "TRADE_COMPUTER_INVALID_INPUT",
        null,
        "journal provided without a finite injected timestampMs — wall-clock is banned, pass timestampMs explicitly",
      );
    }
  }
  const timestampMs = options.timestampMs as number | undefined;

  if (!isRecord(card)) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_CARD", null, "card must be an object (got null/array/non-object)");
  }
  const meta = card["meta"] as Record<string, unknown> | undefined;
  if (!isRecord(meta) || typeof meta["pair"] !== "string" || typeof meta["analysisPointMs"] !== "number" || !Number.isFinite(meta["analysisPointMs"] as number)) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_CARD", null, "card.meta must carry pair + finite analysisPointMs");
  }
  const zones = card["zones"] as unknown;
  const designations = card["designations"] as unknown;
  const setups = card["setups"] as unknown;
  const provenance = card["provenance"] as Record<string, unknown> | undefined;
  if (!Array.isArray(zones) || !Array.isArray(designations) || !Array.isArray(setups)) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_CARD", null, "card must carry zones[] + designations[] + setups[] arrays");
  }
  if (setups.length === 0) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_CARD", null, "card.setups[] is empty — no candidates, nothing to compute");
  }
  if (!isRecord(provenance) || !Array.isArray(provenance["entries"])) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_CARD", null, "card.provenance.entries[] is required — unprovenanced cards are refused");
  }

  if (!isRecord(verdicts)) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_VERDICTS", null, "verdicts must be an object carrying L1..L5");
  }
  const legs = ["l1", "l2", "l3", "l4", "l5"] as const;
  for (const leg of legs) {
    if (!isRecord(verdicts[leg])) {
      throw new TradeComputerError("TRADE_COMPUTER_INVALID_VERDICTS", null, `verdicts.${leg} is missing — all five meta-layer verdicts are required`);
    }
  }
  const l1 = verdicts["l1"] as TelescopeVerdict;
  const l2 = verdicts["l2"] as PressureVerdict;
  const l3 = verdicts["l3"] as FibVerdict;
  const l4 = verdicts["l4"] as CascadeVerdict;
  const l5 = verdicts["l5"] as TiVerdict;
  if (!Array.isArray(l1.boMOriginIds) || !Array.isArray(l1.htfZoneIds)) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_VERDICTS", null, "verdicts.l1 must carry boMOriginIds[] + htfZoneIds[]");
  }
  if (!Array.isArray(l2.overlay)) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_VERDICTS", null, "verdicts.l2 must carry overlay[]");
  }
  if (!Array.isArray(l3.tradeChecks)) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_VERDICTS", null, "verdicts.l3 must carry tradeChecks[]");
  }
  if (!Array.isArray(l4.perTradeInverseMapping)) {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_VERDICTS", null, "verdicts.l4 must carry perTradeInverseMapping[]");
  }
  if (typeof l5.tradeValid !== "boolean" || typeof l5.score !== "number") {
    throw new TradeComputerError("TRADE_COMPUTER_INVALID_VERDICTS", null, "verdicts.l5 must carry tradeValid + score");
  }

  const pair = meta["pair"] as TradePair;
  const causationId = options.causationId ?? `trade-computer:${pair}:${String(meta["analysisPointMs"])}`;

  const refuse = (code: TradeComputerErrorCode, tradeId: string | null, detail: string): never => {
    if (journal !== null && timestampMs !== undefined) {
      journal.append({
        causationId,
        kind: "trade-computer.refuse",
        payload: { code, tradeId, reason: detail },
        timestampMs,
      });
    }
    throw new TradeComputerError(code, tradeId, detail);
  };

  const anchored = new Set<string>();
  for (const entry of provenance["entries"] as Array<unknown>) {
    if (isRecord(entry) && typeof entry["id"] === "string") anchored.add(entry["id"] as string);
  }
  const requiredIds: string[] = [];
  for (const z of zones as Array<Record<string, unknown>>) {
    if (typeof z["zoneId"] === "string") requiredIds.push(z["zoneId"] as string);
  }
  for (const d of designations as Array<Record<string, unknown>>) {
    if (typeof d["id"] === "string") requiredIds.push(d["id"] as string);
  }
  for (const s of setups as Array<Record<string, unknown>>) {
    if (typeof s["id"] === "string") requiredIds.push(s["id"] as string);
  }
  const charts = (card["visuals"] as Record<string, unknown> | undefined)?.["charts"];
  if (Array.isArray(charts)) {
    for (const c of charts as Array<Record<string, unknown>>) {
      if (typeof c["path"] === "string") requiredIds.push(c["path"] as string);
    }
  }
  for (const id of requiredIds) {
    if (!anchored.has(id)) {
      refuse("TRADE_COMPUTER_PROVENANCE_INCOMPLETE", null, `card id '${id}' has no provenance anchor — every id traces to a source (SC-14)`);
    }
  }

  if (l5.tradeValid !== true) {
    refuse("TRADE_COMPUTER_CONFLUENCE_FAIL", null, "L5 warhead confluence graded tradeValid=false — no projection is emitted");
  }

  const links: CandidateLink[] = [];
  for (const raw of setups as Array<Record<string, unknown>>) {
    const setupId = typeof raw["id"] === "string" ? (raw["id"] as string) : "";
    const zoneId = typeof raw["zoneId"] === "string" ? (raw["zoneId"] as string) : "";
    const direction = raw["direction"] as TradeDirection;
    const rr = raw["rr"] as unknown;
    if (setupId.length === 0 || zoneId.length === 0 || (direction !== "LONG" && direction !== "SHORT")) {
      refuse("TRADE_COMPUTER_INVALID_CARD", setupId.length > 0 ? setupId : null, "setup must carry id + zoneId + direction LONG|SHORT");
    }
    if (typeof rr !== "number" || !Number.isFinite(rr)) {
      refuse("TRADE_COMPUTER_INVALID_CARD", setupId, `setup '${setupId}' rr must be a finite number (W-7: RRR computable)`);
    }
    const setupRr = rr as number;
    if (setupRr < RRR_FLOOR) {
      refuse("RRR_FLOOR_VIOLATION", setupId, `setup '${setupId}' rr ${setupRr} below the D-R1 floor ${RRR_FLOOR}`);
    }
    const linked = (designations as Array<Record<string, unknown>>).find(
      (d) => d["direction"] === direction && (d["supplyZoneId"] === zoneId || d["demandZoneId"] === zoneId),
    );
    if (linked === undefined) {
      refuse("TRADE_COMPUTER_PROVENANCE_INCOMPLETE", setupId, `setup '${setupId}' links to no ${direction} designation over zone '${zoneId}' — orphan candidate refused`);
    }
    const designation = linked as Record<string, unknown>;
    const slZoneRef = direction === "LONG"
      ? (designation["demandZoneId"] as string)
      : (designation["supplyZoneId"] as string);
    const tpZoneRef = direction === "LONG"
      ? (designation["supplyZoneId"] as string)
      : (designation["demandZoneId"] as string);
    const overlayRow = l2.overlay.find((row) => row.zoneId === zoneId);
    if (overlayRow === undefined) {
      refuse("TRADE_COMPUTER_PROVENANCE_INCOMPLETE", setupId, `setup '${setupId}' zone '${zoneId}' has no L2 pressure overlay row — the L2 leg is missing`);
    }
    const fibCheck = l3.tradeChecks.find((check) => check.tradeId === setupId);
    if (fibCheck === undefined || fibCheck.entryOk !== true || fibCheck.targetOk !== true) {
      refuse("TRADE_COMPUTER_FIB_MISMATCH", setupId, `setup '${setupId}' fails the L3 fib anchor verification (entryOk+targetOk required)`);
    }
    let dxyInverseZoneId: string | null = null;
    if (pair !== "DXY") {
      const inverse = l4.perTradeInverseMapping.find((row) => row.tradeId === setupId);
      if (inverse === undefined || inverse.inverseExists !== true || typeof inverse.dxyInverseZoneId !== "string" || inverse.dxyInverseZoneId.length === 0) {
        refuse("TRADE_COMPUTER_CASCADE_FAIL", setupId, `setup '${setupId}' (${pair} ${direction}) has no DXY inverse in the L4 mapping — layer FAILS, nothing emitted`);
      }
      dxyInverseZoneId = (inverse as { dxyInverseZoneId: string }).dxyInverseZoneId;
    }
    const l1TelescopeZoneId = l1.boMOriginIds.includes(zoneId)
      ? zoneId
      : l1.htfZoneIds.includes(zoneId) ? zoneId : null;
    links.push({
      setupId,
      zoneId,
      direction,
      rr: setupRr,
      designationId: designation["id"] as string,
      slZoneRef,
      tpZoneRef,
      l1TelescopeZoneId,
      l4DxyInverseZoneId: dxyInverseZoneId,
    });
  }

  const metaLayerVerdicts: TradeProjectionMetaLayerVerdicts = { L1: l1, L2: l2, L3: l3, L4: l4, L5: l5 };
  const projections: TradeProjection[] = links.map((link) => ({
    id: link.setupId,
    pair,
    direction: link.direction,
    entryZoneRef: link.zoneId,
    slZoneRef: link.slZoneRef,
    tpZoneRef: link.tpZoneRef,
    rr: link.rr,
    metaLayerVerdicts,
    provenance: {
      cardSetupId: link.setupId,
      cardZoneId: link.zoneId,
      cardDesignationId: link.designationId,
      l1TelescopeZoneId: link.l1TelescopeZoneId,
      l2PressureZoneId: link.zoneId,
      l3FibTradeId: link.setupId,
      l4DxyInverseZoneId: link.l4DxyInverseZoneId,
      l5Score: l5.score,
    },
  }));

  if (journal !== null && timestampMs !== undefined) {
    journal.append({
      causationId,
      kind: "trade-computer.emit",
      payload: { pair, count: projections.length, projectionIds: projections.map((p) => p.id) },
      timestampMs,
    });
  }
  return projections;
}
